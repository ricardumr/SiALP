import * as React from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { theme } from "../estilo";
import { useState, useEffect } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { auth, firestore } from "../firebase";
import {
  Checkbox,
  Button as PaperButton,
  IconButton,
} from "react-native-paper";
import { TextInput } from "react-native-paper";
import { ArrowLeft } from "lucide-react-native";
import { Item } from "../model/Item";
import { Sala } from "../model/Sala";
import { setSalaProgress } from "../model/conferenciaProgress";
import { getCurrentUserContext } from "../model/userContext";

import { useRoute } from "@react-navigation/native";

export default function Conferencia_inventario() {
  const navigation = useNavigation();
  const route: any = useRoute();
  const fixedSala = route?.params?.sala ?? "";
  const salaUsuario = route?.params?.salaUsuario ?? "";
  const routeAdminUids = route?.params?.adminUids ?? [];
  const routeCanEdit =
    typeof route?.params?.canEdit === "boolean" ? route.params.canEdit : null;
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterPatrimonio, setFilterPatrimonio] = useState("");
  const [filterSala, setFilterSala] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [draftSala, setDraftSala] = useState("");
  const [draftPatrimonio, setDraftPatrimonio] = useState("");
  const [salaSearch, setSalaSearch] = useState("");
  const [itemDetalhe, setItemDetalhe] = useState<Item | null>(null);
  const [detalheModalVisible, setDetalheModalVisible] = useState(false);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [filtradas, setFiltradas] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const columnWidths = {
    sala: 180,
    patrimonio: 180,
    checkbox: 90,
  };
  const totalWidth =
    columnWidths.sala +
    columnWidths.patrimonio +
    columnWidths.checkbox * 3;

  const [statuses, setStatuses] = useState<{ [key: string]: string | null }>(
    {}
  );
  const [itemObservations, setItemObservations] = useState<{
    [key: string]: string;
  }>({});
  const [editingConference, setEditingConference] = useState<any>(null);
  const [adm, setAdm] = useState<boolean>(false);
  const [admLoaded, setAdmLoaded] = useState<boolean>(false);
  const [adminUids, setAdminUids] = useState<string[]>(routeAdminUids);
  const [canEdit, setCanEdit] = useState<boolean>(true);
  const [observationModalVisible, setObservationModalVisible] = useState(false);
  const [observationDraft, setObservationDraft] = useState("");
  const [pendingStatusItemKey, setPendingStatusItemKey] = useState<string | null>(null);
  const [pendingStatusValue, setPendingStatusValue] = useState<string | null>(null);
  const restrictedSalaMessage =
    "Esta sala está vinculada a outro responsável. Se você precisar acesso, fale com um administrador.";
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [, requestCameraPermission] = useCameraPermissions();
  const [manualItemModalVisible, setManualItemModalVisible] = useState(false);
  const [manualItemPatrimonio, setManualItemPatrimonio] = useState("");
  const [manualItemDescricao, setManualItemDescricao] = useState("");
  const [manualMissingItems, setManualMissingItems] = useState<
    Array<{
      itemId: string;
      itemNome: string;
      sala: string;
      patrimonio: string;
      status: "not_found";
      observacao: string;
      manual: boolean;
    }>
  >([]);
  const currentUid = auth.currentUser?.uid ?? "";
  const normalizeValue = React.useCallback(
    (value: string) => String(value || "").trim().toLowerCase(),
    []
  );
  const isOwnerValueFromCurrentUser = React.useCallback(
    (ownerValue: string) => {
      const ownerRaw = normalizeValue(ownerValue);
      if (!ownerRaw) return false;
      if (ownerRaw === normalizeValue(currentUid)) return true;
      if (ownerRaw === normalizeValue(currentUserNome)) return true;
      if (ownerRaw === normalizeValue(currentUserEmail)) return true;
      return false;
    },
    [currentUid, currentUserNome, currentUserEmail, normalizeValue]
  );
  const visibleSalas = React.useMemo(() => {
    if (!admLoaded) return [];
    return adm
      ? salas
      : salas.filter((s) => isOwnerValueFromCurrentUser(String((s as any).usuario || "")));
  }, [adm, admLoaded, salas, isOwnerValueFromCurrentUser]);
  const visibleSalaNames = React.useMemo(
    () => new Set(visibleSalas.map((s) => String(s.nome || "").trim())),
    [visibleSalas]
  );

  const safeGoBack = React.useCallback(() => {
    // evita warning quando não há tela anterior
    // @ts-ignore
    if (navigation?.canGoBack && navigation.canGoBack()) {
      // @ts-ignore
      navigation.goBack();
    } else {
      // @ts-ignore
      navigation.navigate("Conferencia de inventário" as never);
    }
  }, [navigation]);
  

  // Carrega itens e setup inicial
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (!admLoaded) return;
    if (!bancoId) return;
    setLoading(true);

    // Itens visíveis para todos os usuários
    const query: any = firestore
      .collection("Usuario")
      .doc(bancoId)
      .collection("Item");

    const subscriber = query.onSnapshot(
      (snap: any) => {
        const ItensLista: any[] = [];
        snap.forEach((documento: any) => {
          const data = documento.data();
          const salaNome = String(data?.sala || "").trim();
          if (!adm && !visibleSalaNames.has(salaNome)) return;
          // filtra por sala no cliente se necessário
          if (filterSala && data?.sala !== filterSala) return;
          ItensLista.push({ ...data, key: documento.id });
        });
        setItens(ItensLista);
        setFiltradas(ItensLista);
        setLoading(false);
      },
      (error: any) => {
        console.error("Erro ao carregar itens:", error);
        setLoading(false);
      }
    );

    return () => subscriber();
  }, [adm, admLoaded, filterSala, visibleSalaNames, bancoId]);

  // Carrega salas para filtro com autocomplete
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (!bancoId) return;
    let unsub: any;

    // Salas visíveis para todos os usuários
    unsub = firestore
      .collection("Usuario")
      .doc(bancoId)
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

    return () => {
      if (unsub) unsub();
    };
  }, [bancoId]);

  // Se navegado para editar conferência existente, armazena
  useEffect(() => {
    getCurrentUserContext().then((context) => {
      if (!context) return;
      setAdm(context.adm);
      setBancoId(context.bancoId);
      firestore
        .collection("Usuario")
        .where("bancoId", "==", context.bancoId)
        .get()
        .then((snapshot) => {
          const adminIds: string[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as any;
          if (data?.adm) adminIds.push(docSnap.id);
            if (docSnap.id === uid) {
              setAdm(!!data?.adm);
            }
          });
          setAdminUids(adminIds);
          setAdmLoaded(true);
        });
    });

    const conf = route?.params?.conferencia;
    if (conf) {
      setEditingConference(conf);
      if (conf.sala) {
        setFilterSala(conf.sala);
      }
    }
  }, [route?.params]);

  // Se entrou por sala específica, carregar a última conferência salva
  useEffect(() => {
    if (!fixedSala) return;
    if (!admLoaded) return;
    if (route?.params?.conferencia) return;
    const uid = auth.currentUser?.uid;
    if (!uid || !bancoId) return;

    firestore
      .collection("Usuario")
      .doc(bancoId)
      .collection("Conferencia")
      .where("sala", "==", fixedSala)
      .get()
      .then((snapshot) => {
        let latestDraft: { data: any; id: string; time: number } | null = null;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (!adm && data.createdByUid && data.createdByUid !== uid) return;
          if (!adm && !visibleSalaNames.has(String(data?.sala || "").trim())) return;
          const ts = data.timestamp || data.data;
          const time = ts?.toDate ? ts.toDate().getTime() : ts ? new Date(ts).getTime() : 0;
          if (!data.finalizada && (!latestDraft || time > latestDraft.time)) {
            latestDraft = { data, id: docSnap.id, time };
          }
        });
        if (latestDraft) {
          setEditingConference({ ...latestDraft.data, key: latestDraft.id });
        }
      })
      .catch((error) => {
        console.error("Erro ao carregar última conferência:", error);
      });
  }, [fixedSala, route?.params, adm, admLoaded, visibleSalaNames, bancoId]);

  useEffect(() => {
    if (fixedSala) {
      setFilterSala(fixedSala);
      setSalaSearch(fixedSala);
    }
  }, [fixedSala]);

  // Define permissão de edição (admin pode tudo; usuário comum só se for responsável)
  useEffect(() => {
    if (!admLoaded) return;
    if (routeCanEdit !== null) {
      setCanEdit(routeCanEdit);
      return;
    }
    if (!fixedSala) {
      setCanEdit(true);
      return;
    }
    if (adm) {
      setCanEdit(true);
      return;
    }
    if (salaUsuario) {
      setCanEdit(isOwnerValueFromCurrentUser(salaUsuario));
      return;
    }
    if (visibleSalaNames.has(fixedSala)) {
      setCanEdit(true);
      return;
    }
    setCanEdit(false);
  }, [
    routeCanEdit,
    fixedSala,
    adm,
    salaUsuario,
    admLoaded,
    visibleSalaNames,
    isOwnerValueFromCurrentUser,
  ]);



  // When items are loaded and we have an editing conference, map its statuses
  useEffect(() => {
    if (!editingConference) return;
    if (!itens || itens.length === 0) return;

    const mapStatuses: { [key: string]: string | null } = {};
    const mapObservations: { [key: string]: string } = {};
    // editingConference.itens contains itemId (original key) and status
    editingConference.itens.forEach((ic: any) => {
      // find local item matching itemId
      const local = itens.find((it) => getItemKey(it) === ic.itemId);
      if (local) {
        const key = getItemKey(local);
        mapStatuses[key] = ic.status || null;
        mapObservations[key] = String(ic.observacao ?? "");
      }
    });

    // initialize any other items as null
    itens.forEach((it) => {
      const key = getItemKey(it);
      if (mapStatuses[key] === undefined) mapStatuses[key] = null;
    });

    setStatuses(mapStatuses);
    setItemObservations(mapObservations);
  }, [editingConference, itens]);

  function setStatus(itemKey: string, value: string) {
    if (!canEdit) return;
    if (value === "correct") {
      setStatuses((prev) => ({
        ...prev,
        [itemKey]: prev[itemKey] === value ? null : value,
      }));
      setItemObservations((prev) => {
        const next = { ...prev };
        delete next[itemKey];
        return next;
      });
      return;
    }

    if (statuses[itemKey] === value) {
      setStatuses((prev) => ({
        ...prev,
        [itemKey]: null,
      }));
      setItemObservations((prev) => {
        const next = { ...prev };
        delete next[itemKey];
        return next;
      });
      return;
    }

    setPendingStatusItemKey(itemKey);
    setPendingStatusValue(value);
    setObservationDraft(itemObservations[itemKey] || "");
    setObservationModalVisible(true);
  }

  function confirmObservation() {
    if (!pendingStatusItemKey || !pendingStatusValue) return;
    const trimmedObservation = observationDraft.trim();
    if (!trimmedObservation) {
      Alert.alert("Observação obrigatória", "Informe detalhes sobre a ausência do ite .");
      return;
    }
    setStatuses((prev) => ({
      ...prev,
      [pendingStatusItemKey]: pendingStatusValue,
    }));
    setItemObservations((prev) => ({
      ...prev,
      [pendingStatusItemKey]: trimmedObservation,
    }));
    setObservationModalVisible(false);
    setObservationDraft("");
    setPendingStatusItemKey(null);
    setPendingStatusValue(null);
  }

  function cancelObservationModal() {
    setObservationModalVisible(false);
    setObservationDraft("");
    setPendingStatusItemKey(null);
    setPendingStatusValue(null);
  }

  const openScanner = async () => {
    const permissionResult = await requestCameraPermission();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permissão necessária",
        "Autorize o acesso à câmera para ler o código de barras."
      );
      return;
    }
    setHasScanned(false);
    setScanModalVisible(true);
  };

  const closeScanner = () => {
    setScanModalVisible(false);
    setHasScanned(false);
  };

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (hasScanned) return;
    setHasScanned(true);
    const code = String(data || "").trim();
    const salaAtual = String(filterSala || fixedSala || "").trim();

    if (!salaAtual) {
      Alert.alert("Selecione uma sala", "Escolha uma sala antes de ler o código.", [
        { text: "OK", onPress: closeScanner },
      ]);
      return;
    }

    const encontradoNaSala = itens.some(
      (it) =>
        String(it.sala || "").trim().toLowerCase() === salaAtual.toLowerCase() &&
        String(it.patrimonio || "").trim().toLowerCase() === code.toLowerCase()
    );

    if (!encontradoNaSala) {
      setManualItemPatrimonio(code);
      setManualItemDescricao("");
      closeScanner();
      setManualItemModalVisible(true);
      return;
    }

    setDraftPatrimonio(code);
    setFilterPatrimonio(code);
    Alert.alert("Código lido", `Patrimônio preenchido: ${code}`, [
      { text: "OK", onPress: closeScanner },
    ]);
  };

  const salvarItemManualNaoEncontrado = () => {
    const patrimonio = manualItemPatrimonio.trim();
    const descricao = manualItemDescricao.trim();
    const salaAtual = String(filterSala || fixedSala || "").trim();

    if (!patrimonio) {
      Alert.alert("Patrimônio inválido", "Leia ou informe um patrimônio válido.");
      return;
    }
    if (!salaAtual) {
      Alert.alert("Sala inválida", "Selecione uma sala antes de salvar.");
      return;
    }
    if (!descricao) {
      Alert.alert("Descrição obrigatória", "Descreva o item não encontrado.");
      return;
    }

    setManualMissingItems((prev) => {
      const semDuplicado = prev.filter(
        (item) =>
          !(
            item.sala.toLowerCase() === salaAtual.toLowerCase() &&
            item.patrimonio.toLowerCase() === patrimonio.toLowerCase()
          )
      );
      return [
        ...semDuplicado,
        {
          itemId: `manual_${salaAtual}_${patrimonio}`.toLowerCase(),
          itemNome: "Item não cadastrado",
          sala: salaAtual,
          patrimonio,
          status: "not_found",
          observacao: descricao,
          manual: true,
        },
      ];
    });

    setManualItemModalVisible(false);
    setManualItemPatrimonio("");
    setManualItemDescricao("");
    setFilterSala(salaAtual);
    setDraftSala(salaAtual);
    setFilterPatrimonio(patrimonio);
    setDraftPatrimonio(patrimonio);
    Alert.alert("Registro adicionado", "Item não cadastrado incluído na conferência.");
  };

  const getSalaItems = React.useCallback(
    (salaNome: string) =>
      itens.filter((it) => String(it.sala || "").trim() === salaNome),
    [itens]
  );

  const getItemKey = (item: any) => item.key || item.id || JSON.stringify(item);

  // Validar se todos os itens têm uma checkbox marcada
  const allItemsChecked = (): boolean => {
    if (!filterSala) return false;
    const salaItens = getSalaItems(filterSala);
    if (salaItens.length === 0) return false;
    return salaItens.every((item) => {
      const key = getItemKey(item);
      return statuses[key] !== null && statuses[key] !== undefined;
    });
  };

  const hasAnyChecked = (): boolean => {
    const salaAtual = String(filterSala || "").trim();
    if (!salaAtual) return false;
    const salaItens = getSalaItems(salaAtual);
    if (salaItens.length === 0) return false;
    return salaItens.some((item) => {
      const key = getItemKey(item);
      return statuses[key] !== null && statuses[key] !== undefined;
    });
  };

  // Salvar conferência no Firestore
  const salvarConferencia = async () => {
    try {
      if (!canEdit) {
        Alert.alert(
          "Apenas visualização",
          "Você não tem permissão para editar esta sala."
        );
        return;
      }
      const uid = auth.currentUser?.uid;
      if (!uid) {
        Alert.alert("Erro", "Usuário não autenticado");
        return;
      }
      if (!bancoId) {
        Alert.alert("Erro", "Banco de dados do usuário não encontrado");
        return;
      }
      if (!filterSala) {
        Alert.alert("Atenção", "Selecione uma sala para salvar.");
        return;
      }
      const manualMissingFromSala = manualMissingItems.filter(
        (item) => item.sala.toLowerCase() === filterSala.toLowerCase()
      );

      if (!hasAnyChecked() && manualMissingFromSala.length === 0) {
        Alert.alert(
          "Atenção",
          "Marque ao menos um item ou registre um item não cadastrado para salvar."
        );
        return;
      }

      // Construir array de itens com seus status
      const itensConfirmados = getSalaItems(filterSala).map((item) => {
        const key = getItemKey(item);
        return {
          itemId: getItemKey(item),
          itemNome: item.nome,
          sala: item.sala,
          patrimonio: item.patrimonio,
          status: statuses[key] ?? null,
          observacao: itemObservations[key] || "",
        };
      });
      const itensCompletos = [...itensConfirmados, ...manualMissingFromSala];

      // If editing existing conference, update it; otherwise create new
      if (editingConference && editingConference.key) {
        await firestore
          .collection("Usuario")
          .doc(bancoId)
          .collection("Conferencia")
          .doc(editingConference.key)
          .update({
            itens: itensCompletos,
            timestamp: new Date(),
            sala: filterSala,
            finalizada: false,
          });

        Alert.alert("Sucesso!", "Conferência salva como rascunho.", [
          {
            text: "OK",
            onPress: () => safeGoBack(),
          },
        ]);
      } else {
        // Criar objeto de conferência
        const conferencia = {
          id: `conferencia_${Date.now()}`,
          data: new Date(),
          itens: itensCompletos,
          timestamp: new Date(),
          sala: filterSala,
          createdByUid: uid,
          createdByEmail: auth.currentUser?.email,
          finalizada: false,
        };

        // Salvar no Firestore
        await firestore
          .collection("Usuario")
          .doc(bancoId)
          .collection("Conferencia")
          .doc(conferencia.id)
          .set(conferencia);

        Alert.alert("Sucesso!", "Conferência salva como rascunho.", [
          {
            text: "OK",
            onPress: () => safeGoBack(),
          },
        ]);
      }
    } catch (error) {
      console.error("Erro ao salvar conferência:", error);
      Alert.alert("Erro", "Não foi possível salvar a conferência");
    }
  };

  // Filtrar itens quando os filtros mudam
  useEffect(() => {
    const hasPatr = !!filterPatrimonio.trim();
    const hasSala = !!filterSala.trim();
    if (!hasPatr && !hasSala) {
      setFiltradas([]);
      return;
    }

    const patr = filterPatrimonio.toLowerCase();
    const sala = filterSala.trim().toLowerCase();

    const filtered = itens.filter((it) => {
      const patrimonio = (it.patrimonio || "").toLowerCase();
      const salaItem = (it.sala || "").toLowerCase();
      const matchPatr = hasPatr ? patrimonio.includes(patr) : true;
      const matchSala = hasSala ? salaItem === sala : true;
      return matchPatr && matchSala;
    });

    setFiltradas(filtered);
  }, [itens, filterPatrimonio, filterSala]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPatrimonio, filterSala, itens]);

  useEffect(() => {
    if (!filterSala) return;
    const salaItens = getSalaItems(filterSala);
    const checked = salaItens.filter((it) => {
      const key = getItemKey(it);
      return statuses[key] !== null && statuses[key] !== undefined;
    }).length;
    setSalaProgress(filterSala, checked, salaItens.length);
  }, [filterSala, getSalaItems, statuses]);

  // guard edit access for non-admin
  React.useEffect(() => {
    if (editingConference && !adm) {
      const myUid = auth.currentUser?.uid;
      // check ownership first
      if (editingConference.createdByUid && editingConference.createdByUid !== myUid) {
        Alert.alert(
          "Acesso negado",
          "Você não pode editar conferências criadas por outro usuário.",
          [{ text: "OK", onPress: () => safeGoBack() }]
        );
      }
    }
  }, [editingConference, adm, safeGoBack]);

  React.useEffect(() => {
    if (!admLoaded) return;
    if (!fixedSala) return;
    if (adm) return;

    const normalizedFixedSala = normalizeValue(fixedSala);
    const allowedByRouteOwner =
      !!salaUsuario && isOwnerValueFromCurrentUser(salaUsuario);
    const allowedByVisibleSalas = Array.from(visibleSalaNames).some(
      (nomeSala) => normalizeValue(nomeSala) === normalizedFixedSala
    );

    if (!allowedByRouteOwner && !allowedByVisibleSalas) {
      Alert.alert(
        "Acesso restrito",
        restrictedSalaMessage,
        [{ text: "OK", onPress: () => safeGoBack() }]
      );
    }
  }, [
    fixedSala,
    salaUsuario,
    adm,
    safeGoBack,
    admLoaded,
    isOwnerValueFromCurrentUser,
    restrictedSalaMessage,
    visibleSalaNames,
    normalizeValue,
  ]);

  const renderHeader = () => (
    <View style={{ marginTop: 16 }}>
      <View style={localStyles.headerCard}>
        <Text style={localStyles.headerTitle}>Conferência de Inventário</Text>
        {filterSala ? (
          <Text style={localStyles.headerSub}>
            Sala: {filterSala}
          </Text>
        ) : null}
        {!canEdit ? (
          <Text style={localStyles.headerSub}>
            Modo: somente visualização
          </Text>
        ) : null}
        {editingConference && editingConference.createdByEmail && (
          <Text style={localStyles.headerSub}>
            Criado por: {editingConference.createdByEmail}
          </Text>
        )}
         {/* <TextInput
            mode="outlined"
            placeholder="Digite a data..."
            value={dataFiltro}
            onChangeText={filtrarPorData}
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.accent}
            textColor="#fff"
            style={{ backgroundColor: theme.colors.surface }}
          /> */}
        <View style={{ width: "100%", marginBottom: 8, marginTop: 6 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              style={localStyles.filterButton}
              onPress={() => {
                setDraftSala(filterSala);
                setDraftPatrimonio(filterPatrimonio);
                setSalaSearch(filterSala);
                setFilterModalVisible(true);
              }}
            >
              <Text style={localStyles.filterButtonText}>Filtrar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={localStyles.scanButton}
              onPress={openScanner}
            >
              <Text style={localStyles.filterButtonText}>Ler código</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFilterModal = () => (
    <Modal visible={filterModalVisible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View style={[styles.card, { width: "100%", padding: 16 }]}>
          <Text style={[styles.title, { marginBottom: 12 }]}>Filtrar itens</Text>
          {fixedSala ? (
            <Text style={{ color: theme.colors.textMuted, marginBottom: 8 }}>
              Sala selecionada: {fixedSala}
            </Text>
          ) : (
            <>
              <TextInput
                mode="outlined"
                label="Pesquisar sala (digite e selecione)"
                style={styles.inputOutlined}
                theme={{ colors: { onSurface: "#000000", onSurfaceVariant: "#000000" } }}
                outlineColor="#fff"
                activeOutlineColor="#fff"
                textColor="#000000"
                placeholderTextColor="#000000"
                value={salaSearch}
                onChangeText={(valor) => {
                  setSalaSearch(valor);
                  setDraftSala("");
                }}
              />

              {salaSearch.trim().length > 0 ? (
                <View style={{ maxHeight: 160, marginBottom: 8 }}>
                  <ScrollView>
                    {visibleSalas
                      .filter((s) =>
                        String(s.nome || "")
                          .toLowerCase()
                          .startsWith(salaSearch.trim().toLowerCase())
                      )
                      .map((s) => (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => {
                            setDraftSala(s.nome);
                            setSalaSearch(s.nome);
                          }}
                          style={{
                            paddingVertical: 8,
                            borderBottomWidth: 1,
                            borderBottomColor: theme.colors.border,
                          }}
                        >
                          <Text style={{ color: theme.colors.text }}>{s.nome}</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              ) : null}

              {draftSala ? (
                <Text style={{ color: theme.colors.textMuted, marginBottom: 8 }}>
                  Sala selecionada: {draftSala}
                </Text>
              ) : null}
            </>
          )}

          <TextInput
            mode="outlined"
            label="Filtrar por patrimônio"
            style={styles.inputOutlined}
            theme={{ colors: { onSurface: "#000000", onSurfaceVariant: "#000000" } }}
            outlineColor="#fff"
            activeOutlineColor="#fff"
            textColor="#000000"
            placeholderTextColor="#000000"
            value={draftPatrimonio}
            onChangeText={setDraftPatrimonio}
          />

          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                const search = salaSearch.trim().toLowerCase();
                const match =
                  !draftSala && search
                    ? visibleSalas.find((s) =>
                        String(s.nome || "")
                          .toLowerCase()
                          .startsWith(search)
                      )?.nome ?? ""
                    : "";
                const nextSala = fixedSala || draftSala || match || "";
                if (
                  !adm &&
                  nextSala &&
                  !Array.from(visibleSalaNames).some(
                    (nomeSala) =>
                      normalizeValue(nomeSala) === normalizeValue(nextSala)
                  )
                ) {
                  Alert.alert(
                    "Acesso restrito",
                    "Você só pode conferir salas pelas quais é responsável."
                  );
                  return;
                }
                const nextPatrimonio = draftPatrimonio.trim();
                setFilterSala(nextSala);
                setFilterPatrimonio(nextPatrimonio);
                setFilterModalVisible(false);
              }}
            >
              <Text style={styles.primaryButtonText}>Aplicar</Text>
            </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondButton}
                onPress={() => {
                  setDraftSala("");
                  setDraftPatrimonio("");
                  setSalaSearch("");
                  setFilterSala(fixedSala || "");
                  setFilterPatrimonio("");
                  setFilterModalVisible(false);
                }}
              >
              <Text style={styles.secondButtonText}>Limpar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.secondButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderObservationModal = () => (
    <Modal visible={observationModalVisible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View style={[styles.card, { width: "100%", padding: 16 }]}>
          <Text style={[styles.title, { marginBottom: 12 }]}>
            Informe o que foi encontrado
          </Text>
          <TextInput
            mode="outlined"
            label="Observação"
            value={observationDraft}
            onChangeText={setObservationDraft}
            multiline
            numberOfLines={4}
            style={[styles.inputOutlined, { minHeight: 110 }]}
            outlineColor="#fff"
            activeOutlineColor="#fff"
            textColor="#000000"
            placeholderTextColor="#000000"
          />
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={confirmObservation}
            >
              <Text style={styles.primaryButtonText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondButton}
              onPress={cancelObservationModal}
            >
              <Text style={styles.secondButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderManualItemModal = () => (
    <Modal visible={manualItemModalVisible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View style={[styles.card, { width: "100%", padding: 16 }]}>
          <Text style={[styles.title, { marginBottom: 12 }]}>
            Item não cadastrado na sala
          </Text>
          <Text style={{ color: theme.colors.textMuted, marginBottom: 8 }}>
            Sala: {filterSala || fixedSala || "-"}
          </Text>
          <TextInput
            mode="outlined"
            label="Patrimônio"
            value={manualItemPatrimonio}
            onChangeText={setManualItemPatrimonio}
            style={styles.inputOutlined}
            outlineColor="#fff"
            activeOutlineColor="#fff"
            textColor="#fff"
            placeholderTextColor="#fff"
          />
          <TextInput
            mode="outlined"
            label="Descrição do item encontrado"
            value={manualItemDescricao}
            onChangeText={setManualItemDescricao}
            multiline
            numberOfLines={4}
            style={[styles.inputOutlined, { minHeight: 110 }]}
            outlineColor="#fff"
            activeOutlineColor="#fff"
            textColor="#fff"
            placeholderTextColor="#fff"
          />
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={salvarItemManualNaoEncontrado}
            >
              <Text style={styles.primaryButtonText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondButton}
              onPress={() => setManualItemModalVisible(false)}
            >
              <Text style={styles.secondButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderScannerModal = () => (
    <Modal visible={scanModalVisible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
              "code128",
              "code39",
              "itf14",
              "codabar",
              "qr",
            ],
          }}
          onBarcodeScanned={hasScanned ? undefined : onBarcodeScanned}
        />
        <View style={localStyles.scanOverlay}>
          <Text style={localStyles.scanText}>
            Aponte a câmera para o código de barras do patrimônio
          </Text>
          <TouchableOpacity style={styles.secondButton} onPress={closeScanner}>
            <Text style={styles.secondButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderItem = ({ item }: { item: any }) => {
    const key = getItemKey(item);
    const status = statuses[key] || null;
    const currentObservation = itemObservations[key] || "";
    return (
      <View style={localStyles.rowCard}>
        <View style={styles.tableRow}>
          <View style={[styles.cell, { flex: 0, width: columnWidths.sala }]}>
            <Text style={localStyles.cellText}>{item.sala}</Text>
          </View>
          <View style={[styles.cell, { flex: 0, width: columnWidths.patrimonio }]}>
            <TouchableOpacity
              onPress={() => {
                setItemDetalhe(item);
                setDetalheModalVisible(true);
              }}
            >
              <Text style={localStyles.patrimonioText}>
                {item.patrimonio}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.checkboxCell, { width: columnWidths.checkbox }]}>
            <TouchableOpacity
              onPress={() => setStatus(key, "correct")}
              disabled={!canEdit}
              style={{
                flexDirection: "row",
                alignItems: "center",
                opacity: canEdit ? 1 : 0.5,
              }}
            >
              <View
                style={[
                  localStyles.checkCircle,
                  status === "correct" && localStyles.checkCircleActive,
                ]}
              >
                <Text
                  style={[
                    localStyles.checkText,
                    status === "correct" && localStyles.checkTextActive,
                  ]}
                >
                  ✓
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={[styles.checkboxCell, { width: columnWidths.checkbox }]}>
            <TouchableOpacity
              onPress={() => setStatus(key, "wrong")}
              disabled={!canEdit}
              style={{
                flexDirection: "row",
                alignItems: "center",
                opacity: canEdit ? 1 : 0.5,
              }}
            >
              <View
                style={[
                  localStyles.checkCircle,
                  status === "wrong" && localStyles.checkCircleWrong,
                ]}
              >
                <Text
                  style={[
                    localStyles.checkText,
                    status === "wrong" && localStyles.checkTextActive,
                  ]}
                >
                  ✓
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={[styles.checkboxCell, { width: columnWidths.checkbox }]}>
            <TouchableOpacity
              onPress={() => setStatus(key, "not_found")}
              disabled={!canEdit}
              style={{
                flexDirection: "row",
                alignItems: "center",
                opacity: canEdit ? 1 : 0.5,
              }}
            >
              <View
                style={[
                  localStyles.checkCircle,
                  status === "not_found" && localStyles.checkCircleNotFound,
                ]}
              >
                <Text
                  style={[
                    localStyles.checkText,
                    status === "not_found" && localStyles.checkTextActive,
                  ]}
                >
                  ✓
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        {!!currentObservation && (
          <View style={{ marginTop: 10, width: "100%" }}>
            <Text style={localStyles.observationLabel}>Observação:</Text>
            <Text style={localStyles.observationText}>{currentObservation}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderDetalheModal = () => (
    <Modal visible={detalheModalVisible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View style={[styles.card, { width: "100%", padding: 16 }]}>
          <Text style={[styles.title, { marginBottom: 12 }]}>
            Detalhes do Patrimônio
          </Text>
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: "700", color: theme.colors.text }}>
              Nome:
            </Text>
            <Text>{itemDetalhe?.nome ?? "-"}</Text>
            <Text style={{ fontWeight: "700", color: theme.colors.text, marginTop: 6 }}>
              Sala:
            </Text>
            <Text>{itemDetalhe?.sala ?? "-"}</Text>
            <Text style={{ fontWeight: "700", color: theme.colors.text, marginTop: 6 }}>
              Patrimônio:
            </Text>
            <Text>{itemDetalhe?.patrimonio ?? "-"}</Text>
            <Text style={{ fontWeight: "700", color: theme.colors.text, marginTop: 6 }}>
              Estado:
            </Text>
            <Text>{itemDetalhe?.estado ?? "-"}</Text>
            <Text style={{ fontWeight: "700", color: theme.colors.text, marginTop: 6 }}>
              Observação:
            </Text>
            <Text>{itemDetalhe?.observacao ?? "-"}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={styles.secondButton}
              onPress={() => setDetalheModalVisible(false)}
            >
              <Text style={styles.secondButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View
      style={[styles.container, localStyles.screen]}
    >
      {renderFilterModal()}
      {renderObservationModal()}
      {renderManualItemModal()}
      {renderDetalheModal()}
      {renderScannerModal()}
      <View style={localStyles.topBar}>
        <TouchableOpacity
          onPress={safeGoBack}
          style={localStyles.topBackButton}
          activeOpacity={0.85}
        >
          <ArrowLeft color="#f4f6f5" size={28} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
      {renderHeader()}
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ minWidth: totalWidth, width: "100%" }}>
          <View style={localStyles.tableHeader}>
            <View style={[styles.cell, { flex: 0, width: columnWidths.sala }]}>
              <Text style={localStyles.tableHeaderText}>Sala</Text>
            </View>
            <View style={[styles.cell, { flex: 0, width: columnWidths.patrimonio }]}>
              <Text style={localStyles.tableHeaderText}>Patrimônio</Text>
            </View>
            <View style={[styles.checkboxCell, { width: columnWidths.checkbox }]}>
              <Text style={localStyles.tableHeaderText}>Sim</Text>
            </View>
            <View style={[styles.checkboxCell, { width: columnWidths.checkbox }]}>
              <Text style={localStyles.tableHeaderText}>Sim (fora)</Text>
            </View>
            <View style={[styles.checkboxCell, { width: columnWidths.checkbox }]}>
              <Text style={localStyles.tableHeaderText}>Não</Text>
            </View>
          </View>
          <FlatList
            data={filtradas.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
            keyExtractor={(item) => getItemKey(item)}
            refreshing={loading}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingBottom: 220,
              width: "100%",
              alignItems: "center",
            }}
          />
        </View>
      </ScrollView>
      <View style={localStyles.bottomBar}>
        <View style={localStyles.paginationContainer}>
          <TouchableOpacity
            onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 6,
              borderWidth: 1,
              borderColor:
                currentPage === 1 ? theme.colors.textMuted : theme.colors.border,
            }}
          >
            <Text style={{ color: theme.colors.border, fontSize: 12 }}>‹</Text>
          </TouchableOpacity>
          <View style={localStyles.paginationPill}>
            <Text style={localStyles.paginationText}>
              {`Página ${currentPage} de ${Math.max(
                1,
                Math.ceil(filtradas.length / pageSize)
              )}`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              setCurrentPage((p) =>
                Math.min(p + 1, Math.max(1, Math.ceil(filtradas.length / pageSize)))
              )
            }
            disabled={currentPage >= Math.max(1, Math.ceil(filtradas.length / pageSize))}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 6,
              borderWidth: 1,
              borderColor:
                currentPage >= Math.max(1, Math.ceil(filtradas.length / pageSize))
                  ? theme.colors.textMuted
                  : theme.colors.border,
            }}
          >
            <Text style={{ color: theme.colors.border, fontSize: 12 }}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={localStyles.footerCard}>
          <PaperButton
            mode="contained"
            style={[
              localStyles.saveButton,
              {
                backgroundColor: hasAnyChecked() ? "#2f8b73" : "#a7b8b4",
              },
            ]}
            disabled={!hasAnyChecked()}
            onPress={salvarConferencia}
            labelStyle={localStyles.saveButtonText}
          >
            Salvar Conferência
          </PaperButton>
        </View>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  screen: {
    backgroundColor: theme.colors.background,
    justifyContent: "flex-start",
    paddingTop: 28,
  },
  topBar: {
    width: "100%",
    alignItems: "flex-end",
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  topBackButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#2f5f55",
  },
  headerCard: {
    width: "92%",
    backgroundColor: "#2f5f55",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#eef6f4",
    marginBottom: 6,
  },
  headerSub: {
    color: "#cfe0dc",
    marginBottom: 6,
    fontSize: 13,
  },
  filterButton: {
    alignSelf: "flex-start",
    backgroundColor: "#2f8b73",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  scanButton: {
    alignSelf: "flex-start",
    backgroundColor: "#3c6f97",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  filterButtonText: {
    color: "#e9f7f2",
    fontWeight: "700",
    fontSize: 16,
  },
  scanOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    gap: 10,
  },
  scanText: {
    color: "#ffffff",
    fontSize: 14,
    textAlign: "center",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2f5f55",
    paddingVertical: 10,
    paddingHorizontal: 10,
    width: "100%",
    justifyContent: "space-between",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  tableHeaderText: {
    fontWeight: "700",
    color: "#e9f3f0",
  },
  rowCard: {
    backgroundColor: "#f4f6f5",
    borderRadius: 16,
    marginVertical: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cellText: {
    color: "#213b36",
    fontWeight: "600",
  },
  patrimonioText: {
    color: "#2a5f55",
    textDecorationLine: "underline",
    fontWeight: "700",
  },
  checkCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#9fb3ad",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkCircleActive: {
    backgroundColor: "#3a8b6f",
    borderColor: "#2f7b62",
  },
  checkCircleWrong: {
    backgroundColor: "#c8873a",
    borderColor: "#b47936",
  },
  checkCircleNotFound: {
    backgroundColor: "#c85c5c",
    borderColor: "#b45252",
  },
  checkText: {
    color: "#7f9891",
    fontSize: 18,
    fontWeight: "800",
  },
  checkTextActive: {
    color: "#ffffff",
  },
  paginationPill: {
    backgroundColor: "#e2ebe8",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  paginationText: {
    color: "#2a4a45",
    fontSize: 12,
    fontWeight: "700",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: "center",
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  observationLabel: {
    color: "#2a4a45",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  observationText: {
    color: "#4f6660",
    fontSize: 12,
  },
  footerCard: {
    width: "92%",
    alignSelf: "center",
    backgroundColor: "#e2ebe8",
    borderRadius: 18,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 12,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
});
