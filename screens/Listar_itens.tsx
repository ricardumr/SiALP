import * as React from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import styles, { theme } from "../estilo";
import Header from "../components/Header";
import { useState, useEffect } from "react";
import { auth, firestore } from "../firebase";
import { TextInput } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import { Item } from "../model/Item";
import { Sala } from "../model/Sala";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import firebase from "firebase/compat/app";
import { getCurrentUserContext } from "../model/userContext";

type PageCursor = {
  firstDoc: any;
  lastDoc: any;
};

export default function Listar_itens() {
  const [bancoId, setBancoId] = useState<string | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [firstDoc, setFirstDoc] = useState<any>(null);
  const [hasNext, setHasNext] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [salasLoaded, setSalasLoaded] = useState(false);
  const [filterPatrimonio, setFilterPatrimonio] = useState("");
  const [filterSala, setFilterSala] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [draftSala, setDraftSala] = useState("");
  const [draftPatrimonio, setDraftPatrimonio] = useState("");
  const [salaSearch, setSalaSearch] = useState("");
  const [editItem, setEditItem] = useState<Partial<Item> | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"actions" | "edit">("actions");
  const [exportando, setExportando] = useState(false);
  const pageCursorsRef = React.useRef<Record<number, PageCursor>>({});
  const columnWidths = {
    acoes: 150,
    nome: 180,
    sala: 160,
    patrimonio: 180,
    estado: 160,
  };
  const pageSize = 50;
  const totalWidth =
    columnWidths.nome +
    columnWidths.sala +
    columnWidths.patrimonio +
    columnWidths.estado +
    columnWidths.acoes;

  const refItem = React.useMemo(
    () => (bancoId ? firestore.collection("Usuario").doc(bancoId).collection("Item") : null),
    [bancoId]
  );

  const refSala = React.useMemo(
    () => (bancoId ? firestore.collection("Usuario").doc(bancoId).collection("Sala") : null),
    [bancoId]
  );

  const carregarSalas = React.useCallback(async () => {
    if (!refSala || salasLoaded) return;
    const snapshot = await refSala.get();
    const salasArray: Sala[] = snapshot.docs.map((doc: any) => ({
      ...doc.data(),
      id: doc.id,
    })) as Sala[];
    setSalas(salasArray);
    setSalasLoaded(true);
  }, [refSala, salasLoaded]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) {
        setBancoId(null);
        return;
      }
      getCurrentUserContext().then((context) => {
        setBancoId(context?.bancoId ?? null);
      });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!bancoId || !refItem) return;
    setSalas([]);
    setSalasLoaded(false);
    setLastDoc(null);
    setFirstDoc(null);
    setCurrentPage(1);
<<<<<<< HEAD
    setFilteredCache(null);
    pageCursorsRef.current = {};
=======
>>>>>>> 572ec0a (foi a camera)
    carregarTotal();
    carregarPagina("first");
  }, [filterPatrimonio, filterSala, bancoId]);

  useEffect(() => {
    if (filterModalVisible || (modalVisible && modalMode === "edit")) {
      carregarSalas().catch(() => {
        console.log("Erro ao carregar salas.");
      });
    }
  }, [carregarSalas, filterModalVisible, modalMode, modalVisible]);

  const montarQuery = () => {
    const sala = filterSala.trim();
    const patrimonio = filterPatrimonio.trim();
    if (!refItem) return null;
    let query: any = refItem;
    if (sala) {
      query = query.where("sala", "==", sala);
    }
    if (patrimonio) {
      query = query
        .orderBy("patrimonio")
        .where("patrimonio", ">=", patrimonio)
        .where("patrimonio", "<=", `${patrimonio}\uf8ff`);
    } else {
      query = query.orderBy("nome");
    }
    return query;
  };

  const carregarTotal = async () => {
    try {
      if (!refItem) return;
      const query = montarQuery();
      if (!query) return;
      if (typeof (query as any).count === "function") {
        const snap = await (query as any).count().get();
        setTotal(snap.data().count);
      } else {
        const snap = await query.get();
        setTotal(snap.size);
      }
    } catch {
      setTotal(null);
    }
  };

  const carregarPagina = async (modo: "first" | "next" | "prev") => {
    if (loading) return;
    if (!refItem) return;
    setLoading(true);

    let query = montarQuery();
    if (!query) {
      setLoading(false);
      return;
    }
    if (modo === "next" && lastDoc) {
      query = query.startAfter(lastDoc).limit(pageSize);
    } else if (modo === "prev" && firstDoc) {
      query = query.endBefore(firstDoc).limitToLast(pageSize);
    } else {
      query = query.limit(pageSize);
    }

    let snapshot;
    try {
      snapshot = await query.get();
    } catch (e) {
      console.log("Erro ao carregar itens com filtro:", e);
      alert("Não foi possível aplicar o filtro. Verifique os dados ou tente novamente.");
      setLoading(false);
      return;
    }
    const itensArr: Item[] = snapshot.docs.map((documento) => ({
      ...documento.data(),
      key: documento.id,
    })) as Item[];

    setItens(itensArr);
    setFirstDoc(snapshot.docs[0] || null);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
    const newPage =
      modo === "next" ? currentPage + 1 : modo === "prev" ? Math.max(1, currentPage - 1) : 1;
    pageCursorsRef.current[newPage] = {
      firstDoc: snapshot.docs[0] || null,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    };
    setCurrentPage(newPage);
    if (total !== null) {
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      setHasNext(newPage < totalPages);
    } else {
      setHasNext(snapshot.docs.length === pageSize);
    }
    setLoading(false);
  };

  const carregarPaginaNumero = async (targetPage: number) => {
    if (loading) return;
    const normalizedTarget = Math.max(1, targetPage);
    if (normalizedTarget === currentPage) return;
    if (!refItem) return;

    if (usarFiltroLocal()) {
      const all = filteredCache ?? (await carregarFiltradoLocal());
      if (!filteredCache) setFilteredCache(all);

      const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
      const safeTarget = Math.min(normalizedTarget, totalPages);
      const start = (safeTarget - 1) * pageSize;
      const pageItems = all.slice(start, start + pageSize);

      setItens(pageItems);
      setFirstDoc(null);
      setLastDoc(null);
      setCurrentPage(safeTarget);
      setHasNext(start + pageSize < all.length);
      setTotal(all.length);
      return;
    }

    setLoading(true);
    try {
      const totalPages = total !== null ? Math.max(1, Math.ceil(total / pageSize)) : normalizedTarget;
      const safeTarget = Math.min(normalizedTarget, totalPages);

      let query = montarQuery();
      if (!query) return;

      if (safeTarget > 1) {
        let previousPage = safeTarget - 1;
        while (previousPage >= 1 && !pageCursorsRef.current[previousPage]?.lastDoc) {
          previousPage -= 1;
        }

        let cursor = previousPage >= 1 ? pageCursorsRef.current[previousPage]?.lastDoc : null;

        if (previousPage === 0) {
          let bootstrapSnapshot = await query.limit(pageSize).get();
          pageCursorsRef.current[1] = {
            firstDoc: bootstrapSnapshot.docs[0] || null,
            lastDoc: bootstrapSnapshot.docs[bootstrapSnapshot.docs.length - 1] || null,
          };
          previousPage = 1;
          cursor = pageCursorsRef.current[1]?.lastDoc ?? null;
        }

        for (let page = previousPage + 1; page < safeTarget; page += 1) {
          const intermediateSnapshot = await query.startAfter(cursor).limit(pageSize).get();
          pageCursorsRef.current[page] = {
            firstDoc: intermediateSnapshot.docs[0] || null,
            lastDoc: intermediateSnapshot.docs[intermediateSnapshot.docs.length - 1] || null,
          };
          cursor = intermediateSnapshot.docs[intermediateSnapshot.docs.length - 1] || null;
          if (!cursor) break;
        }

        const targetCursor = pageCursorsRef.current[safeTarget - 1]?.lastDoc;
        if (!targetCursor) {
          throw new Error(`Cursor da página ${safeTarget - 1} não encontrado.`);
        }

        query = query.startAfter(targetCursor).limit(pageSize);
      } else {
        query = query.limit(pageSize);
      }

      const snapshot = await query.get();
      const itensArr: Item[] = snapshot.docs.map((documento: any) => ({
        ...documento.data(),
        key: documento.id,
      })) as Item[];

      setItens(itensArr);
      setFirstDoc(snapshot.docs[0] || null);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      pageCursorsRef.current[safeTarget] = {
        firstDoc: snapshot.docs[0] || null,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
      };
      setCurrentPage(safeTarget);
      setHasNext(total !== null ? safeTarget < totalPages : snapshot.docs.length === pageSize);
    } catch (e) {
      console.log("Erro ao navegar para a página:", e);
      alert("Não foi possível carregar a página selecionada.");
    } finally {
      setLoading(false);
    }
  };

  const exportarXLSX = async () => {
    try {
      if (exportando) return;
      setExportando(true);
      const exportPageSize = 500;
      let todosItens: Item[] = [];
      let last: any = null;

      while (true) {
        let query = refItem
          .orderBy(firebase.firestore.FieldPath.documentId())
          .limit(exportPageSize);
        if (last) query = query.startAfter(last);
        let snapshot;
        try {
          snapshot = await query.get({ source: "server" } as any);
        } catch {
          snapshot = await query.get();
        }
        if (snapshot.empty) break;

        const batch: Item[] = snapshot.docs.map((documento) => ({
          ...documento.data(),
          key: documento.id,
        })) as Item[];
        todosItens = todosItens.concat(batch);

        last = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.size < exportPageSize) break;
      }

      if (todosItens.length === 0) {
        alert("Não há itens para exportar");
        return;
      }
      const data = todosItens
        .sort((a, b) =>
          String(a.nome ?? "")
            .localeCompare(String(b.nome ?? ""), "pt-BR", {
              sensitivity: "base",
            })
        )
        .map((item) => ({
        Nome: item.nome ?? "",
        Estado: item.estado ?? "",
        Patrimonio: item.patrimonio ?? "",
        Observacao: item.observacao ?? "",
        Sala: item.sala ?? "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Itens");
      const base64 = XLSX.write(workbook, {
        type: "base64",
        bookType: "xlsx",
      });

      const fileUri = `${FileSystem.documentDirectory}itens_${Date.now()}.xlsx`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Exportar planilha de itens",
        });
      } else {
        alert("Arquivo exportado, mas compartilhamento não está disponível.");
      }
    } catch (error) {
      alert("Não foi possível exportar o XLSX");
    } finally {
      setExportando(false);
    }
  };

  const excluir = async (item) => {
    Alert.alert(
      "Confirmar exclusão",
      "Tem certeza que deseja excluir este item?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          onPress: async () => {
            await refItem
              .doc(item.key || item.id)
              .delete()
              .then(() => {
                alert("Excluído com sucesso!");
                setItens((prev) =>
                  prev.filter(
                    (i) => (i as any).key !== (item.key || item.id)
                  )
                );
                setTotal((prev) => (prev === null ? null : Math.max(0, prev - 1)));
              });
          },
          style: "destructive",
        },
      ]
    );
  };

  const editar = (item: Item) => {
    carregarSalas().catch(() => {
      console.log("Erro ao carregar salas.");
    });
    setEditItem({ ...item });
    setModalMode("edit");
    setModalVisible(true);
  };

  const fecharModal = () => {
    setModalVisible(false);
    setEditItem(null);
    setModalMode("actions");
  };

  const detalhar = (item: Item) => {
    setEditItem({ ...item });
    setModalMode("actions");
    setModalVisible(true);
  };

  const salvarEdicao = async () => {
    if (!editItem) return;
    const id = (editItem as any).key || editItem.id;
    if (!id) {
      alert("Item inválido");
      return;
    }

    const payload = {
      nome: editItem.nome ?? "",
      estado: editItem.estado ?? "",
      patrimonio: editItem.patrimonio ?? "",
      observacao: editItem.observacao ?? "",
      sala: editItem.sala ?? "",
    };

    await refItem
      .doc(id)
      .update(payload)
      .then(() => {
        alert("Item atualizado com sucesso!");
        fecharModal();
        setItens((prev) =>
          prev.map((i) => ((i as any).key || i.id) === id ? ({ ...i, ...payload } as Item) : i)
        );
      });
  };

  const renderRow = React.useCallback(
    ({ item, index }: { item: Item; index: number }) => (
      <View
        style={[
          { flexDirection: "row" },
          index === itens.length - 1 && styles.tableLastRow,
        ]}
      >
        <View
          style={[
            styles.tableColumnCell,
            styles.tableColumnDivider,
            { width: columnWidths.nome },
          ]}
        >
          <Text style={[styles.tableDataCell, styles.tableColumnText]} numberOfLines={1}>
            {item.nome}
          </Text>
        </View>

        <View
          style={[
            styles.tableColumnCell,
            styles.tableColumnDivider,
            { width: columnWidths.sala },
          ]}
        >
          <Text style={[styles.tableDataCell, styles.tableColumnText]} numberOfLines={1}>
            {item.sala}
          </Text>
        </View>

        <View
          style={[
            styles.tableColumnCell,
            styles.tableColumnDivider,
            { width: columnWidths.patrimonio },
          ]}
        >
          <Text style={[styles.tableDataCell, styles.tableColumnText]} numberOfLines={1}>
            {item.patrimonio}
          </Text>
        </View>

        <View
          style={[
            styles.tableColumnCell,
            styles.tableColumnDivider,
            { width: columnWidths.estado },
          ]}
        >
          <Text style={[styles.tableDataCell, styles.tableColumnText]}>
            {item.estado}
          </Text>
        </View>

        <View style={[styles.tableColumnCell, { width: columnWidths.acoes }]}>
          <TouchableOpacity onPress={() => detalhar(item)} style={styles.tableActionButton}>
            <Text style={styles.tableActionButtonText}>Detalhar</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [columnWidths, itens.length, detalhar]
  );

  const renderModal = () => (
    <Modal visible={modalVisible} transparent animationType="fade">
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
          {modalMode === "actions" ? (
            <>
              <Text style={[styles.title, { marginBottom: 12 }]}>
                Detalhar Item
              </Text>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: "700", color: theme.colors.text }}>
                  Nome:
                </Text>
                <Text>{editItem?.nome ?? "-"}</Text>
                <Text style={{ fontWeight: "700", color: theme.colors.text, marginTop: 6 }}>
                  Sala:
                </Text>
                <Text>{editItem?.sala ?? "-"}</Text>
                <Text style={{ fontWeight: "700", color: theme.colors.text, marginTop: 6 }}>
                  Patrimônio:
                </Text>
                <Text>{editItem?.patrimonio ?? "-"}</Text>
                <Text style={{ fontWeight: "700", color: theme.colors.text, marginTop: 6 }}>
                  Estado:
                </Text>
                <Text>{editItem?.estado ?? "-"}</Text>
                <Text style={{ fontWeight: "700", color: theme.colors.text, marginTop: 6 }}>
                  Observação:
                </Text>
                <Text>{editItem?.observacao ?? "-"}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setModalMode("edit")}
                >
                  <Text style={styles.primaryButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondButton}
                  onPress={() => {
                    if (editItem) {
                      excluir(editItem);
                    }
                  }}
                >
                  <Text style={styles.secondButtonText}>Excluir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondButton}
                  onPress={fecharModal}
                >
                  <Text style={styles.secondButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.title, { marginBottom: 12 }]}>Editar Item</Text>

              <TextInput
                mode="outlined"
                label="Nome"
                style={styles.inputOutlined}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.accent}
                textColor="#fff"
                value={editItem?.nome ?? ""}
                onChangeText={(valor) =>
                  setEditItem((prev) => ({ ...prev, nome: valor }))
                }
              />

              <TextInput
                mode="outlined"
                label="Estado"
                style={styles.inputOutlined}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.accent}
                textColor="#fff"
                value={editItem?.estado ?? ""}
                onChangeText={(valor) =>
                  setEditItem((prev) => ({ ...prev, estado: valor }))
                }
              />

              <TextInput
                mode="outlined"
                label="Patrimônio"
                style={styles.inputOutlined}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.accent}
                textColor="#fff"
                value={String(editItem?.patrimonio ?? "")}
                onChangeText={(valor) =>
                  setEditItem((prev) => ({ ...prev, patrimonio: valor }))
                }
              />

              <TextInput
                mode="outlined"
                label="Observação"
                style={styles.inputOutlined}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.accent}
                textColor="#fff"
                value={editItem?.observacao ?? ""}
                onChangeText={(valor) =>
                  setEditItem((prev) => ({ ...prev, observacao: valor }))
                }
              />

              <View style={styles.selectWrapper}>
                <Picker
                  mode="dialog"
                  onValueChange={(valor) =>
                    setEditItem((prev) => ({ ...prev, sala: valor }))
                  }
                  selectedValue={editItem?.sala ?? ""}
                >
                  <Picker.Item label="Selecione uma sala..." value="" />
                  {salas.map((sala) => (
                    <Picker.Item key={sala.id} label={sala.nome} value={sala.nome} />
                  ))}
                </Picker>
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={salvarEdicao}
                >
                  <Text style={styles.primaryButtonText}>Salvar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondButton} onPress={fecharModal}>
                  <Text style={styles.secondButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View
    style={[styles.container, {backgroundColor: theme.colors.background}]}
    >
      {renderModal()}
      <View style={{marginBottom: 120, width: "100%", alignItems: "center", justifyContent: "center" }}></View>
      <Header title="Lista de Itens" />

      <View style={{ width: "92%", marginTop: 12, marginBottom: 12 }}>
        <TouchableOpacity
          style={styles.secondButton}
          onPress={() => {
            setDraftSala(filterSala);
            setDraftPatrimonio(filterPatrimonio);
            setSalaSearch(filterSala);
            setFilterModalVisible(true);
          }}
        >
          <Text style={styles.secondButtonText}>Filtrar</Text>
        </TouchableOpacity>
      </View>

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

            <TextInput
              mode="outlined"
              label="Pesquisar sala (digite e selecione)"
              style={styles.inputOutlined}
              theme={{ colors: { onSurface: "#000000", onSurfaceVariant: "#000000" } }}
              outlineColor="#fff"
              activeOutlineColor="#fff"
              textColor="#fff"
              placeholderTextColor="#fff"
              value={salaSearch}
              onChangeText={(valor) => {
                setSalaSearch(valor);
                setDraftSala("");
              }}
            />

            {salaSearch.trim().length > 0 ? (
              <View style={{ maxHeight: 160, marginBottom: 8 }}>
                <ScrollView>
                  {salas
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

            <TextInput
              mode="outlined"
              label="Filtrar por patrimônio"
              style={styles.inputOutlined}
              theme={{ colors: { onSurface: "#000000", onSurfaceVariant: "#000000" } }}
              outlineColor="#fff"
              activeOutlineColor="#fff"
              textColor="#fff"
              placeholderTextColor="#fff"
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
                      ? salas.find((s) =>
                          String(s.nome || "")
                            .toLowerCase()
                            .startsWith(search)
                        )?.nome ?? ""
                      : "";
                  const nextSala = draftSala || match || "";
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
                  setFilterSala("");
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
      
      {itens.length === 0 ? (
        <View style={styles.tableEmptyContainer}>
          <Text style={styles.tableEmptyText}>Nenhum item cadastrado</Text>
        </View>
      ) : (
        <View style={{ width: "100%" }}>
          <ScrollView
            horizontal
            style={styles.tableContainer}
            showsHorizontalScrollIndicator={true}
          >
            <View style={{ minWidth: 920 }}>
              <View style={{ flexDirection: "row" }}>
                <View
                  style={[
                    styles.tableHeaderRow,
                    {
                      width: columnWidths.nome,
                      alignItems: "center",
                      justifyContent: "center",
                      borderTopRightRadius: 0,
                    },
                    styles.tableColumnDivider,
                  ]}
                >
                  <Text style={styles.tableHeaderText}>Nome</Text>
                </View>
                <View
                  style={[
                    styles.tableHeaderRow,
                    {
                      width: columnWidths.sala,
                      alignItems: "center",
                      justifyContent: "center",
                      borderTopLeftRadius: 0,
                      borderTopRightRadius: 0,
                      marginLeft: 0,
                    },
                    styles.tableColumnDivider,
                  ]}
                >
                  <Text style={styles.tableHeaderText}>Sala</Text>
                </View>
                <View
                  style={[
                    styles.tableHeaderRow,
                    {
                      width: columnWidths.patrimonio,
                      alignItems: "center",
                      justifyContent: "center",
                      borderTopLeftRadius: 0,
                      borderTopRightRadius: 0,
                    },
                    styles.tableColumnDivider,
                  ]}
                >
                  <Text style={styles.tableHeaderText}>Patrimônio</Text>
                </View>
                <View
                  style={[
                    styles.tableHeaderRow,
                    {
                      width: columnWidths.estado,
                      alignItems: "center",
                      justifyContent: "center",
                      borderTopLeftRadius: 0,
                      borderTopRightRadius: 0,
                    },
                    styles.tableColumnDivider,
                  ]}
                >
                  <Text style={styles.tableHeaderText}>Estado</Text>
                </View>
                <View
                  style={[
                    styles.tableHeaderRow,
                    {
                      width: columnWidths.acoes,
                      alignItems: "center",
                      justifyContent: "center",
                      borderTopLeftRadius: 0,
                    },
                  ]}
                >
                  <Text style={styles.tableHeaderText}>Ações</Text>
                </View>
              </View>

              <FlatList
                data={itens}
                keyExtractor={(item, index) => String((item as any).key || item.id || index)}
                renderItem={renderRow}
                style={{ maxHeight: "65%" }}
                contentContainerStyle={{ flexGrow: 1 }}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                initialNumToRender={12}
                windowSize={5}
                removeClippedSubviews
              />
              <View
                style={{
                  width: totalWidth,
                  backgroundColor: theme.colors.surface,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: theme.colors.text, fontSize: 13 }}>
                  {`Itens nesta página: ${itens.length}${total !== null ? ` • Total: ${total}` : ""}`}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: theme.colors.background,
                    paddingVertical: 6,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => carregarPagina("prev")}
                    disabled={currentPage === 1 || loading}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor:
                        currentPage === 1 || loading ? theme.colors.textMuted : theme.colors.border,
                    }}
                  >
                    <Text style={{ color: theme.colors.border, fontSize: 12 }}>‹</Text>
                  </TouchableOpacity>

                  {(() => {
                    const totalPages =
                      total !== null ? Math.max(1, Math.ceil(total / pageSize)) : null;
                    const pages: (number | "...")[] = [];
                    if (!totalPages || totalPages <= 5) {
                      const max = totalPages ?? currentPage + 1;
                      for (let p = 1; p <= max; p++) pages.push(p);
                    } else if (currentPage <= 3) {
                      pages.push(1, 2, 3, "...", totalPages);
                    } else if (currentPage >= totalPages - 2) {
                      pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
                    } else {
                      pages.push(
                        1,
                        "...",
                        currentPage - 1,
                        currentPage,
                        currentPage + 1,
                        "...",
                        totalPages
                      );
                    }
                    return pages.map((p, idx) =>
                      p === "..." ? (
                        <Text key={`dots-${idx}`} style={{ color: theme.colors.border, fontSize: 12 }}>
                          ...
                        </Text>
                      ) : (
                        <TouchableOpacity
                          key={p}
                          onPress={() => carregarPaginaNumero(p)}
                          disabled={p === currentPage || loading}
                          style={{
                            minWidth: 28,
                            alignItems: "center",
                            paddingVertical: 6,
                            paddingHorizontal: 8,
                            borderRadius: 6,
                            backgroundColor: p === currentPage ? theme.colors.accent : "transparent",
                          }}
                        >
                          <Text
                            style={{
                              color: p === currentPage ? "#ffffff" : theme.colors.border,
                              fontSize: 12,
                              fontWeight: p === currentPage ? "700" : "500",
                            }}
                          >
                            {p}
                          </Text>
                        </TouchableOpacity>
                      )
                    );
                  })()}

                  <TouchableOpacity
                    onPress={() => carregarPagina("next")}
                    disabled={!hasNext || loading}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: !hasNext || loading ? theme.colors.textMuted : theme.colors.border,
                    }}
                  >
                    <Text style={{ color: theme.colors.border, fontSize: 12 }}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            </ScrollView>
          </View>
        
      )}
      

      <View style={{ width: "92%", marginTop: 12, marginBottom: 16 }}></View>

      <View style={{ width: "92%", marginTop: 12, marginBottom: 16 }}>
        <TouchableOpacity
          style={[
            styles.secondButton,
            exportando ? { opacity: 0.6 } : null,
          ]}
          onPress={exportarXLSX}
          disabled={exportando}
        >
          <Text style={[styles.secondButtonText, { marginBottom: 16 }]}>
            {exportando ? "Exportando... aguarde" : "Exportar XLSX"}
          </Text>
        </TouchableOpacity>
        {exportando ? (
          <Text style={{ color: theme.colors.textMuted, marginTop: 6, fontSize: 12 }}>
            Buscando todos os itens no banco de dados.
          </Text>
        ) : null}
      </View>
    </View>
  );

}
