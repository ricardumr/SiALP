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
import Header from "../components/Header";
import { getCurrentUserContext } from "../model/userContext";

export default function Conferencia_salas() {
  const navigation = useNavigation();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtroSala, setFiltroSala] = useState("");
  const [, forceTick] = useState(0);
  const [adm, setAdm] = useState(false);
  const [admLoaded, setAdmLoaded] = useState(false);
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

    firestore
      .collection("Usuario")
      .doc(uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          setAdm(!!doc.data()?.adm);
        }
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
    <View style={[styles.container, localStyles.screen]}>
      <View
        style={{
          marginTop: 120,
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Header title="Conferência de Inventário" />
      </View>

      <View style={localStyles.headerCard}>
        <Text style={localStyles.headerSubtitle}>
          Selecione uma sala para conferir
        </Text>
        <TextInput
          mode="outlined"
          label="Filtrar sala"
          style={styles.inputOutlined}
          outlineColor={theme.colors.border}
          activeOutlineColor={theme.colors.accent}
          textColor="#fff"
          value={filtroSala}
          onChangeText={setFiltroSala}
        />
      </View>

      <FlatList
        data={salas.filter((s) =>
          String(s.nome || "")
            .toLowerCase()
            .includes(filtroSala.trim().toLowerCase())
        )}
        keyExtractor={(item) => item.id}
        renderItem={renderSala}
        style={{ width: "92%", marginTop: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
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
    </View>
  );
}

const localStyles = StyleSheet.create({
  screen: {
    backgroundColor: theme.colors.background,
  },
  headerCard: {
    width: "92%",
    marginTop: 12,
    backgroundColor: theme.colors.drawer,
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  headerSubtitle: {
    color: "#cfe0dc",
    fontSize: 14,
    marginBottom: 12,
  },
  listCard: {
    backgroundColor: "#f3f4f3",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    color: "#1f2f2b",
    fontWeight: "700",
    fontSize: 15,
  },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusPillText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  pillPending: {
    backgroundColor: "#c9a84a",
  },
  pillProgress: {
    backgroundColor: "#6fa255",
  },
  pillDone: {
    backgroundColor: "#2f8b73",
  },
  conferButton: {
    backgroundColor: "#2f8b73",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  conferButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
  finishButton: {
    borderRadius: 16,
    paddingVertical: 12,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
});
