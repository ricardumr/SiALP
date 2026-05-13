import * as React from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ImageBackground,
  Alert,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import styles, { theme } from "../estilo";
import { useState, useEffect } from "react";
import { auth, firestore } from "../firebase";
import Header from "../components/Header";
import { Sala } from "../model/Sala";
import { Usuario } from "../model/Usuario";
import { TextInput } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import { getCurrentUserContext } from "../model/userContext";

export default function Listar_salas() {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [firstDoc, setFirstDoc] = useState<any>(null);
  const [hasNext, setHasNext] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [adm, setAdm] = useState(false);
  const [bancoId, setBancoId] = useState<string | null>(null);
  const [editSala, setEditSala] = useState<Partial<Sala> | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"actions" | "edit">("actions");
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const columnWidths = {
    acoes: 150,
    nome: 220,
    usuario: 220,
  };
  const pageSize = 50;
  const totalWidth = columnWidths.nome + columnWidths.usuario + columnWidths.acoes;

  const currentUid = auth.currentUser?.uid ?? "";

  const refUsuarios = React.useMemo(
    () =>
      bancoId
        ? firestore.collection("Usuario").where("bancoId", "==", bancoId)
        : null,
    [bancoId]
  );

  useEffect(() => {
    getCurrentUserContext().then((context) => {
      if (!context) return;
      setAdm(context.adm);
      setBancoId(context.bancoId);
    });
  }, []);

  useEffect(() => {
    if (!bancoId) return;
    carregarTotal();
    carregarPagina("first");
  }, [adm, bancoId]);

  useEffect(() => {
    if (!refUsuarios) return;
    const sub = refUsuarios.onSnapshot((querySnapshot) => {
      const usuariosArray: Usuario[] = [];
      querySnapshot.forEach((doc) => {
        usuariosArray.push({
          ...doc.data(),
          id: doc.id,
        } as Usuario);
      });
      setUsuarios(usuariosArray);
    });
    return () => sub();
  }, [refUsuarios]);

  const resolveUsuarioId = (value: string) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const byId = usuarios.find((u) => u.id === raw);
    if (byId?.id) return byId.id;
    const byName = usuarios.find(
      (u) => String(u.nome || "").trim().toLowerCase() === raw.toLowerCase()
    );
    return byName?.id ?? raw;
  };

  const getUsuarioLabel = (usuarioId: string) => {
    if (!usuarioId) return "-";
    const match = usuarios.find((u) => u.id === usuarioId);
    return match?.nome ?? usuarioId;
  };

  const carregarTotal = async () => {
    try {
      if (!bancoId) return;
      const query = firestore.collection("Usuario").doc(bancoId).collection("Sala");
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
    setLoading(true);

    if (!bancoId) {
      setLoading(false);
      return;
    }
    let query: any = firestore
      .collection("Usuario")
      .doc(bancoId)
      .collection("Sala")
      .orderBy("nome");
    if (modo === "next" && lastDoc) {
      query = query.startAfter(lastDoc).limit(pageSize);
    } else if (modo === "prev" && firstDoc) {
      query = query.endBefore(firstDoc).limitToLast(pageSize);
    } else {
      query = query.limit(pageSize);
    }

    const snapshot = await query.get();
    const salasArr: Sala[] = snapshot.docs.map((documento: any) => ({
      ...documento.data(),
      key: documento.id,
      ownerUid: bancoId,
    })) as Sala[];

    setSalas(salasArr);
    setFirstDoc(snapshot.docs[0] || null);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
    const newPage =
      modo === "next" ? currentPage + 1 : modo === "prev" ? Math.max(1, currentPage - 1) : 1;
    setCurrentPage(newPage);
    if (total !== null) {
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      setHasNext(newPage < totalPages);
    } else {
      setHasNext(snapshot.docs.length === pageSize);
    }
    setLoading(false);
  };

  const excluir = async (sala: any) => {
    Alert.alert(
      "Confirmar exclusão",
      "Tem certeza que deseja excluir esta sala?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          onPress: async () => {
            const ownerUid = (sala as any).ownerUid || bancoId || currentUid;
            await firestore
              .collection("Usuario")
              .doc(ownerUid)
              .collection("Sala")
              .doc(sala.key || sala.id)
              .delete()
              .then(() => {
                alert("Excluído com sucesso!");
                setSalas((prev) =>
                  prev.filter(
                    (s) => (s as any).key !== (sala.key || sala.id)
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

  const editar = (item: Sala) => {
    setEditSala({
      ...item,
      usuario: resolveUsuarioId((item as any).usuario),
    });
    setModalMode("edit");
    setModalVisible(true);
  };

  const fecharModal = () => {
    setModalVisible(false);
    setEditSala(null);
    setModalMode("actions");
  };

  const detalhar = (item: Sala) => {
    setEditSala({ ...item });
    setModalMode("actions");
    setModalVisible(true);
  };

  const salvarEdicao = async () => {
    if (!editSala) return;
    const id = (editSala as any).key || editSala.id;
    if (!id) {
      alert("Sala inválida");
      return;
    }

    const payload = {
      nome: editSala.nome ?? "",
      usuario: resolveUsuarioId(editSala.usuario ?? ""),
    };

    const ownerUid = (editSala as any).ownerUid || bancoId || currentUid;
    await firestore
      .collection("Usuario")
      .doc(ownerUid)
      .collection("Sala")
      .doc(id)
      .update(payload)
      .then(() => {
        alert("Sala atualizada com sucesso!");
        fecharModal();
        setSalas((prev) =>
          prev.map((s) => ((s as any).key || s.id) === id ? ({ ...s, ...payload } as Sala) : s)
        );
      });
  };

  const salasFiltradas = React.useMemo(() => {
    const nome = filtroNome.trim().toLowerCase();
    const usuario = filtroUsuario.trim();
    return salas.filter((s) => {
      const matchNome = nome
        ? String(s.nome || "").toLowerCase().includes(nome)
        : true;
      const usuarioId = String((s as any).usuario || "");
      const matchUsuario = usuario ? usuarioId === usuario : true;
      return matchNome && matchUsuario;
    });
  }, [salas, filtroNome, filtroUsuario]);

  const renderColumn = (
    headerKey: string,
    renderValue: (sala: Sala) => React.ReactNode,
    columnStyle?: object,
    withDivider?: boolean
  ) => (
    <View
      style={[
        { width: 160, alignSelf: "stretch" },
        columnStyle,
        withDivider && styles.tableColumnDivider,
      ]}
    >
      {salasFiltradas.map((sala, index) => (
        <View
          style={[
            styles.tableColumnCell,
            styles.tableColumnDivider,
            { width: columnWidths.usuario },
          ]}
        >
          <Text style={[styles.tableDataCell, styles.tableColumnText]} numberOfLines={1}>
            {getUsuarioLabel(String((item as any).usuario ?? ""))}
          </Text>
        </View>

        <View style={[styles.tableColumnCell, { width: columnWidths.acoes }]}>
          <TouchableOpacity onPress={() => detalhar(item)} style={styles.tableActionButton}>
            <Text style={styles.tableActionButtonText}>Detalhar</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
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
                Detalhar Sala
              </Text>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: "700", color: theme.colors.text }}>
                  Nome:
                </Text>
                <Text>{editSala?.nome ?? "-"}</Text>
                <Text style={{ fontWeight: "700", color: theme.colors.text, marginTop: 6 }}>
                  Responsável:
                </Text>
                <Text>{getUsuarioLabel(String(editSala?.usuario ?? ""))}</Text>
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
                    if (editSala) {
                      excluir(editSala);
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
              <Text style={[styles.title, { marginBottom: 12 }]}>Editar Sala</Text>

              <TextInput
                mode="outlined"
                label="Nome"
                style={styles.inputOutlined}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.accent}
                textColor="#fff"
                value={editSala?.nome ?? ""}
                onChangeText={(valor) =>
                  setEditSala((prev) => ({ ...prev, nome: valor }))
                }
              />

              <View style={styles.selectWrapper}>
                <Picker
                  mode="dialog"
                  onValueChange={(valor) =>
                    setEditSala((prev) => ({ ...prev, usuario: valor }))
                  }
                  selectedValue={editSala?.usuario ?? ""}
                >
                  <Picker.Item label="Selecione um usuário..." value="" />
                  {usuarios.map((user) => (
                    <Picker.Item
                      key={user.id}
                      label={user.nome}
                      value={user.id}
                    />
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
      <View style={[{ marginTop: 120, width: "100%", alignItems: "center", justifyContent: "center" }]}>
        <Header title="Lista de Salas" />
      </View>
      <View style={{ width: "92%", alignSelf: "center", marginTop: 12, gap: 8 }}>
        <TextInput
          mode="outlined"
          label="Filtrar por nome da sala"
          style={styles.inputOutlined}
          outlineColor={theme.colors.border}
          activeOutlineColor={theme.colors.accent}
          textColor="#fff"
          value={filtroNome}
          onChangeText={setFiltroNome}
        />
        {adm ? (
          <View style={styles.selectWrapper}>
            <Picker
              mode="dialog"
              selectedValue={filtroUsuario}
              onValueChange={(valor) => setFiltroUsuario(String(valor || ""))}
            >
              <Picker.Item label="Todos os responsáveis" value="" />
              {usuarios.map((user) => (
                <Picker.Item key={user.id} label={user.nome} value={user.id} />
              ))}
            </Picker>
          </View>
        ) : null}
      </View>

      {salasFiltradas.length === 0 ? (
        <View style={styles.tableEmptyContainer}>
          <Text style={styles.tableEmptyText}>Nenhuma sala encontrada</Text>
        </View>
      ) : (
        <View style={{ width: "100%" }}>
          <ScrollView
            horizontal
            style={styles.tableContainer}
            showsHorizontalScrollIndicator={true}
          >
            <View style={{ minWidth: 620 }}>
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
                      width: columnWidths.usuario,
                      alignItems: "center",
                      justifyContent: "center",
                      borderTopLeftRadius: 0,
                      borderTopRightRadius: 0,
                    },
                    styles.tableColumnDivider,
                  ]}
                >
                  <Text style={styles.tableHeaderText}>Responsável</Text>
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
                data={salasFiltradas}
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
                    {`Salas nesta página: ${salasFiltradas.length}${total !== null ? ` • Total: ${total}` : ""}`}
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
                            onPress={() =>
                              p < currentPage
                                ? carregarPagina("prev")
                                : p > currentPage
                                ? carregarPagina("next")
                                : undefined
                            }
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
    </View>
  );
}
