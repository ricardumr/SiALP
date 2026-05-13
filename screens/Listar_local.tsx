import * as React from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ImageBackground,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import styles, { theme } from "../estilo";
import Header from "../components/Header";
import { useState, useEffect } from "react";
import { auth, firestore } from "../firebase";
import { TextInput } from "react-native-paper";
import { Item } from "../model/Item";
import { Picker } from "@react-native-picker/picker";
import { Sala } from "../model/Sala";
import { getCurrentUserContext } from "../model/userContext";

export default function Listar_local() {
  const [itens, setItens] = useState<Item[]>([]);
  const [load, setLoad] = useState(true);
  const [tipoSelecionado, setTipoSelecionado] = useState("");
  const [salas, setSalas] = useState<Sala[]>([]);
  const [unsubscribe, setUnsubscribe] = useState<() => void>();
  const [editItem, setEditItem] = useState<Partial<Item> | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"actions" | "edit">("actions");
  const [bancoId, setBancoId] = useState<string | null>(null);
  const columnWidths = {
    nome: 200,
    sala: 140,
    patrimonio: 160,
    estado: 120,
    acoes: 120,
  };

  const refItem = bancoId
    ? firestore.collection("Usuario").doc(bancoId).collection("Item")
    : null;

  const refSala = bancoId
    ? firestore.collection("Usuario").doc(bancoId).collection("Sala")
    : null;

  useEffect(() => {
    getCurrentUserContext().then((context) => {
      if (context) setBancoId(context.bancoId);
    });
  }, []);

  useEffect(() => {
    if (!refSala) return;
    const sub = refSala.onSnapshot((query) => {
      const salasArr: Sala[] = [];
      query.forEach((documento) => {
        salasArr.push({
          ...documento.data(),
          id: documento.id,
        } as Sala);
      });
      setSalas(salasArr);
    });
    return () => sub();
  }, [refSala]);

  useEffect(() => {
    if (unsubscribe) unsubscribe();
    if (!refItem) return;
    const sub = listar();
    setUnsubscribe(() => sub);
  }, [tipoSelecionado, refItem]);

  const listar = () => {
    if (!refItem) return () => {};
    const subscriber = refItem
      .where("sala", "==", tipoSelecionado)
      .onSnapshot((query) => {
        const itensArr: Item[] = [];
        query.forEach((documento) => {
          itensArr.push({
            ...documento.data(),
            key: documento.id,
          } as Item);
        });
        setItens(itensArr);
        setLoad(false);
        console.log(itensArr);
      });
    return () => subscriber();
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
            if (!refItem) return;
            await refItem
              .doc(item.key || item.id)
              .delete()
              .then(() => {
                alert("Excluído com sucesso!");
              });
          },
          style: "destructive",
        },
      ]
    );
  };

  const editar = (item: Item) => {
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

    if (!refItem) return;
    await refItem
      .doc(id)
      .update(payload)
      .then(() => {
        alert("Item atualizado com sucesso!");
        fecharModal();
      });
  };

  const renderColumn = (
    headerKey: string,
    renderValue: (item: Item) => React.ReactNode,
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
      {itens.map((item, index) => (
        <TouchableOpacity
          key={`${headerKey}-${item.key || item.id || index}`}
          style={[
            styles.tableColumnCell,
            index === itens.length - 1 && styles.tableLastRow,
          ]}
          onPress={() => editar(item)}
          onLongPress={() => excluir(item)}
        >
          {renderValue(item)}
        </TouchableOpacity>
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
      <View style={{ width: "100%", marginLeft: 20, marginTop: 90 }}>
        <Header title="Itens por Sala" />

        <View style={styles.selectWrapper}>
          <Picker
            mode="dialog"
            onValueChange={(valor) => {
              setTipoSelecionado(valor);
              setLoad(true);
            }}
            selectedValue={tipoSelecionado}
          >
            <Picker.Item label="Selecione uma sala..." value="" />
            {salas.map((sala) => (
              <Picker.Item key={sala.id} label={sala.nome} value={sala.nome} />
            ))}
          </Picker>
        </View>
      </View>

      {tipoSelecionado === "" ? (
        <View style={styles.tableEmptyContainer}>
          <Text style={styles.tableEmptyText}>Selecione uma sala para listar os itens</Text>
        </View>
      ) : itens.length === 0 ? (
        <View style={styles.tableEmptyContainer}>
          <Text style={styles.tableEmptyText}>Nenhum item nesta sala</Text>
        </View>
      ) : (
        <ScrollView 
          horizontal 
          style={styles.tableContainer}
          showsHorizontalScrollIndicator={false}
        >
          <View style={{ minWidth: 740 }}>
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

            <View style={{ flexDirection: "row" }}>
              {renderColumn(
                "nome",
                (item) => (
                  <Text
                    style={[styles.tableDataCell, styles.tableColumnText]}
                    numberOfLines={1}
                  >
                    {item.nome}
                  </Text>
                ),
                { width: columnWidths.nome },
                true
              )}

              {renderColumn(
                "sala",
                (item) => (
                  <Text
                    style={[styles.tableDataCell, styles.tableColumnText]}
                    numberOfLines={1}
                  >
                    {item.sala}
                  </Text>
                ),
                { width: columnWidths.sala },
                true
              )}

              {renderColumn(
                "patrimonio",
                (item) => (
                  <Text
                    style={[styles.tableDataCell, styles.tableColumnText]}
                    numberOfLines={1}
                  >
                    {item.patrimonio}
                  </Text>
                ),
                { width: columnWidths.patrimonio },
                true
              )}

              {renderColumn(
                "estado",
                (item) => (
                  <Text
                    style={[styles.tableDataCell, styles.tableColumnText]}
                    numberOfLines={1}
                  >
                    {item.estado}
                  </Text>
                ),
                { width: columnWidths.estado },
                true
              )}

              {renderColumn(
                "acoes",
                (item) => (
                  <TouchableOpacity
                    onPress={() => detalhar(item)}
                    style={styles.tableActionButton}
                  >
                    <Text style={styles.tableActionButtonText}>Detalhar</Text>
                  </TouchableOpacity>
                ),
                { width: columnWidths.acoes },
                false
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
