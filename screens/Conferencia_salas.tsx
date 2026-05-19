import * as React from "react";
import { Text, View, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import styles, { theme } from "../estilo";
import { useEffect, useState } from "react";
import { auth, firestore } from "../firebase";
import { Sala } from "../model/Sala";
import { Usuario } from "../model/Usuario";
import { getSalaStatus } from "../model/conferenciaProgress";
import { TextInput, Button as PaperButton } from "react-native-paper";
import { getCurrentUserContext } from "../model/userContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Search } from "lucide-react-native";

export default function Conferencia_salas() {
  const navigation = useNavigation();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtroSala, setFiltroSala] = useState("");
  const [, forceTick] = useState(0);
  const [adm, setAdm] = useState(false);
  const [admLoaded, setAdmLoaded] = useState(false);
  const [bancoId, setBancoId] = useState<string | null>(null);
  const [currentUserNome, setCurrentUserNome] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [adminUids, setAdminUids] = useState<string[]>([]);
  const currentUid = auth.currentUser?.uid ?? "";
  const didMigrateRef = React.useRef(false);
  const restrictedSalaMessage =
    "Esta sala está vinculada a outro responsável. Se você precisar acesso, fale com um administrador.";

  const normalizeValue = React.useCallback(
    (value: string) => String(value || "").trim().toLowerCase(),
    []
  );

  useEffect(() => {
    let unsub: any;
    getCurrentUserContext().then((context) => {
      if (!context) {
        setAdmLoaded(true);
        return;
      }
      setBancoId(context.bancoId ?? null);
      setAdm(!!context.adm);
      setCurrentUserNome(context.nome ?? "");
      setCurrentUserEmail(context.email ?? "");
      setAdmLoaded(true);
      unsub = firestore
        .collection("Usuario")
        .doc(context.bancoId)
        .collection("Sala")
        .onSnapshot((querySnapshot) => {
          const salasArray: Sala[] = [];
          querySnapshot.forEach((docSnap) => {
            salasArray.push({
              ...(docSnap.data() as any),
              id: docSnap.id,
            } as Sala);
          });
          setSalas(salasArray);
        });
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    if (!bancoId) return;
    const sub = firestore
      .collection("Usuario")
      .where("bancoId", "==", bancoId)
      .onSnapshot((querySnapshot) => {
      const usuariosArray: Usuario[] = [];
      const adminIds: string[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<Usuario>;
        usuariosArray.push(new Usuario({ ...data, id: docSnap.id }));
        if (data.adm) adminIds.push(docSnap.id);
      });
      setUsuarios(usuariosArray);
      setAdminUids(adminIds);
    });
    return () => sub();
  }, [bancoId]);

  useEffect(() => {
    if (!adm) return;
    if (!bancoId) return;
    if (didMigrateRef.current) return;
    if (!usuarios.length) return;

    const migrate = async () => {
      didMigrateRef.current = true;
      const nameToUid = new Map<string, string>();
      const duplicateNames = new Set<string>();
      const userIds = new Set<string>();

      usuarios.forEach((u) => {
        if (u.id) userIds.add(u.id);
        const nameKey = String(u.nome || "").trim().toLowerCase();
        if (!nameKey) return;
        if (nameToUid.has(nameKey)) {
          duplicateNames.add(nameKey);
        } else {
          nameToUid.set(nameKey, u.id);
        }
      });

      duplicateNames.forEach((key) => nameToUid.delete(key));

      try {
        const snapshot = await firestore
          .collection("Usuario")
          .doc(bancoId)
          .collection("Sala")
          .get();
        let batch = firestore.batch();
        let batchCount = 0;

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as any;
          const usuarioRaw = String(data.usuario || "").trim();
          if (!usuarioRaw) continue;
          if (userIds.has(usuarioRaw)) continue;

          const key = usuarioRaw.toLowerCase();
          const mappedUid = nameToUid.get(key);
          if (!mappedUid) continue;

          batch.update(docSnap.ref, { usuario: mappedUid });
          batchCount += 1;
          if (batchCount >= 400) {
            await batch.commit();
            batch = firestore.batch();
            batchCount = 0;
          }
        }
        if (batchCount > 0) {
          await batch.commit();
        }
      } catch (error) {
        didMigrateRef.current = false;
      }
    };

    migrate();
  }, [adm, usuarios, bancoId]);

  useFocusEffect(
    React.useCallback(() => {
      forceTick((t) => t + 1);
    }, [])
  );

  const isSalaResponsavelDoUsuario = React.useCallback(
    (sala: Sala) => {
      const ownerRaw = normalizeValue(String((sala as any).usuario || ""));
      if (!ownerRaw) return false;

      if (ownerRaw === normalizeValue(currentUid)) return true;
      if (ownerRaw === normalizeValue(currentUserNome)) return true;
      if (ownerRaw === normalizeValue(currentUserEmail)) return true;

      const ownerUsuario = usuarios.find((u) => {
        const userId = normalizeValue(String(u.id || ""));
        const userNome = normalizeValue(String(u.nome || ""));
        const userEmail = normalizeValue(String((u as any).email || ""));
        return ownerRaw === userId || ownerRaw === userNome || ownerRaw === userEmail;
      });

      return !!ownerUsuario && ownerUsuario.id === currentUid;
    },
    [currentUid, currentUserNome, currentUserEmail, normalizeValue, usuarios]
  );

  const eligibleSalas = adm
    ? salas
    : salas.filter((s) => isSalaResponsavelDoUsuario(s));

  const getStatusColor = (status: string) => {
    if (status === "finalizado") return "#4F8A5B";
    if (status === "em andamento") return "#C8873A";
    return theme.colors.textMuted;
  };

  const finalizarConferencias = async () => {
    try {
      if (
        !(
          eligibleSalas.length > 0 &&
          eligibleSalas.every((s) => getSalaStatus(s.nome) === "finalizado")
        )
      ) {
        return;
      }

      if (!bancoId) return;
      const snapshot = await firestore
        .collection("Usuario")
        .doc(bancoId)
        .collection("Conferencia")
        .orderBy("timestamp", "desc")
        .get();

      const salasElegiveis = new Set(eligibleSalas.map((s) => s.nome));
      const latestBySala = new Map<string, any>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (!salasElegiveis.has(data?.sala)) return;
        if (data?.finalizada) return;
        if (latestBySala.has(data.sala)) return;
        if (!adm && data?.createdByUid !== currentUid) return;
        latestBySala.set(data.sala, docSnap);
      });

      const missingSalas = eligibleSalas
        .map((s) => s.nome)
        .filter((salaNome) => !latestBySala.has(salaNome));

      if (missingSalas.length > 0) {
        const lista = missingSalas.slice(0, 3).join(", ");
        const sufixo =
          missingSalas.length > 3
            ? ` e mais ${missingSalas.length - 3}`
            : "";
        alert(
          `Salve as conferências destas salas antes de finalizar: ${lista}${sufixo}.`
        );
        return;
      }

      const batch = firestore.batch();
      latestBySala.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          finalizada: true,
          finalizedAt: new Date(),
        });
      });
      await batch.commit();

      navigation.navigate("Lista de conferências" as never);
    } catch (error) {
      console.error("Erro ao finalizar conferências:", error);
      alert("Não foi possível finalizar as conferências.");
    }
  };

  const renderSala = ({ item }: { item: Sala }) => {
    const status = getSalaStatus(item.nome);
    const isOwner = isSalaResponsavelDoUsuario(item);
    const canEdit = adm || isOwner;
    const statusLabel =
      status === "em andamento"
        ? "Em andamento"
        : status === "finalizado"
        ? "Finalizado"
        : "Pendente";
    const statusPillStyle =
      status === "em andamento"
        ? localStyles.pillProgress
        : status === "finalizado"
        ? localStyles.pillDone
        : localStyles.pillPending;
    return (
      <View style={localStyles.listCard}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={localStyles.cardTitle}>{item.nome}</Text>
          <View style={[localStyles.statusPill, statusPillStyle]}>
            <Text style={localStyles.statusPillText}>{statusLabel}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={localStyles.conferButton}
          onPress={() => {
            if (!admLoaded) {
              alert("Carregando permissões. Tente novamente em instantes.");
              return;
            }
            if (!canEdit) {
              alert(restrictedSalaMessage);
              return;
            }
            navigation.navigate("Conferencia sala" as never, {
              sala: item.nome,
              salaUsuario: item.usuario,
              adminUids,
              canEdit,
            } as never);
          }}
        >
          <Text style={localStyles.conferButtonText}>Conferir</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={localStyles.screen}>
      <View style={localStyles.bgTopGlow} />
      <View style={localStyles.bgBottomGlow} />

      <View style={localStyles.topRow}>
        <TouchableOpacity
          style={localStyles.backButton}
          onPress={() => {
            // @ts-ignore
            if (navigation?.canGoBack && navigation.canGoBack()) navigation.goBack();
            // @ts-ignore
            else navigation.openDrawer?.();
          }}
        >
          <ArrowLeft color="#e8f2f4" size={28} />
        </TouchableOpacity>
        <Text style={localStyles.screenTitle}>Conferência de Inventário</Text>
      </View>

      <View style={localStyles.headerCard}>
        <Text style={localStyles.headerSubtitle}>
          Selecione uma sala para conferir
        </Text>
        <View style={localStyles.searchWrap}>
          <Search color="#aebec5" size={26} />
          <TextInput
            mode="flat"
            placeholder="Filtrar sala"
            placeholderTextColor="#9db1b8"
            style={localStyles.searchInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            textColor="#eaf4f6"
            value={filtroSala}
            onChangeText={setFiltroSala}
          />
        </View>
      </View>

      <FlatList
        data={eligibleSalas.filter((s) =>
          String(s.nome || "")
            .toLowerCase()
            .includes(filtroSala.trim().toLowerCase())
        )}
        keyExtractor={(item) => item.id}
        renderItem={renderSala}
        style={{ width: "92%", marginTop: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ paddingBottom: 28 }}
        removeClippedSubviews
        ListFooterComponent={
          <View style={{ marginTop: 16, marginBottom: 20 }}>
            <PaperButton
              mode="contained"
              style={[
                localStyles.finishButton,
                {
                  backgroundColor:
                    eligibleSalas.length > 0 &&
                    eligibleSalas.every((s) => getSalaStatus(s.nome) === "finalizado")
                      ? "#2f8b73"
                      : "#a7b8b4",
                },
              ]}
              disabled={
                !(
                  eligibleSalas.length > 0 &&
                  eligibleSalas.every((s) => getSalaStatus(s.nome) === "finalizado")
                )
              }
              onPress={finalizarConferencias}
              labelStyle={localStyles.finishButtonText}
            >
              Finalizar conferências
            </PaperButton>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
  },
  bgTopGlow: {
    position: "absolute",
    top: -120,
    left: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(29,164,152,0.2)",
  },
  bgBottomGlow: {
    position: "absolute",
    bottom: -140,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(14,127,145,0.2)",
  },
  topRow: {
    width: "92%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(16,98,102,0.45)",
    borderWidth: 1,
    borderColor: "rgba(115,200,197,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  screenTitle: {
    color: "#edf4f5",
    fontSize: 24,
    fontWeight: "800",
  },
  headerCard: {
    width: "92%",
    marginTop: 4,
    backgroundColor: "rgba(8,71,79,0.5)",
    borderWidth: 1,
    borderColor: "rgba(126,208,209,0.25)",
    borderRadius: 18,
    padding: 18,
  },
  headerSubtitle: {
    color: "#d6e6e8",
    fontSize: 16,
    marginBottom: 12,
  },
  searchWrap: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: "rgba(150,214,215,0.35)",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "rgba(3,50,57,0.45)",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "transparent",
    marginLeft: 8,
    fontSize: 18,
  },
  listCard: {
    backgroundColor: "rgba(6,64,73,0.48)",
    borderWidth: 1,
    borderColor: "rgba(118,199,200,0.3)",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    color: "#edf4f5",
    fontWeight: "700",
    fontSize: 18,
  },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  statusPillText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  pillPending: {
    backgroundColor: "#c9a02f",
  },
  pillProgress: {
    backgroundColor: "#5d9f53",
  },
  pillDone: {
    backgroundColor: "#2f8b73",
  },
  conferButton: {
    backgroundColor: "#2bbf84",
    minWidth: 120,
    minHeight: 66,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  conferButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 17,
  },
  finishButton: {
    borderRadius: 16,
    paddingVertical: 10,
  },
  finishButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
});
