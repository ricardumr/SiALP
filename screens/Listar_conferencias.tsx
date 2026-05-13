import * as React from "react";
import {
  Text,
  View,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { theme } from "../estilo";
import { useState, useEffect } from "react";
import { auth, firestore } from "../firebase";
import Header from "../components/Header";
import { TextInput, Button as PaperButton } from "react-native-paper";
import { getCurrentUserContext } from "../model/userContext";

export default function Listar_conferencias() {
  const navigation = useNavigation();
  const [conferencias, setConferencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataFiltro, setDataFiltro] = useState("");
  const [filtradas, setFiltradas ] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [conferenciaSelecionada, setConferenciaSelecionada] =
    useState<any>(null);
  const [adm, setAdm] = useState<boolean>(false);
  const [bancoId, setBancoId] = useState<string | null>(null);
  const columnWidths = {
    id: 110,
    data: 130,
    total: 80,
    corretos: 80,
    errados: 80,
    nao: 80,
    usuario: 220,
    acoes: 140,
  };

  useEffect(() => {
    let subscriber: any;

    getCurrentUserContext().then((context) => {
      if (!context) return;
      setAdm(context.adm);
      setBancoId(context.bancoId);

      subscriber = firestore
        .collection("Usuario")
        .doc(context.bancoId)
        .collection("Conferencia")
        .orderBy("timestamp", "desc")
        .onSnapshot((query) => {
        const conferenciasLista: any[] = [];
        query.forEach((documento) => {
          const data = documento.data();
          if (!data?.finalizada) return;
          conferenciasLista.push({
            ...data,
            key: documento.id,
          });
        });
        setConferencias(conferenciasLista);
        setFiltradas(conferenciasLista);
        setLoading(false);
      });
    });

    return () => {
      if (subscriber) subscriber();
    };
  }, []);

  const formatarData = (data: any) => {
    if (!data) return "N/A";
    const dataObj = data.toDate ? data.toDate() : new Date(data);
    return dataObj.toLocaleDateString("pt-BR");
  };

  const filtrarPorData = (texto: string) => {
    setDataFiltro(texto);
    if (!texto) {
      setFiltradas(conferencias);
    } else {
      const filtered = conferencias.filter((conf) => {
        const dataConf = formatarData(conf.data);
        return dataConf.includes(texto);
      });
      setFiltradas(filtered);
    }
  };

  const deleteConferencia = (id: string) => {
    Alert.alert("Deletar", "Tem certeza que deseja deletar essa conferência?", [
      { text: "Cancelar" },
      {
        text: "Deletar",
        onPress: async () => {
          try {
            if (!bancoId) return;
            await firestore
              .collection("Usuario")
              .doc(bancoId)
              .collection("Conferencia")
              .doc(id)
              .delete();
            Alert.alert("Sucesso", "Conferência deletada");
          } catch (error) {
            Alert.alert("Erro", "Não foi possível deletar a conferência");
          }
        },
      },
    ]);
  };

  const getCounts = (item: any) => {
    const totalItens = item.itens?.length || 0;
    const corretos =
      item.itens?.filter((i: any) => i.status === "correct").length || 0;
    const errados =
      item.itens?.filter((i: any) => i.status === "wrong").length || 0;
    const naoEncontrados =
      item.itens?.filter((i: any) => i.status === "not_found").length || 0;
    return { totalItens, corretos, errados, naoEncontrados };
  };

  const renderColumn = (
    headerKey: string,
    renderValue: (item: any) => React.ReactNode,
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
      {filtradas.map((item, index) => (
        <View
          key={`${headerKey}-${item.key || index}`}
          style={[
            styles.tableColumnCell,
            index === filtradas.length - 1 && styles.tableLastRow,
          ]}
        >
          {renderValue(item)}
        </View>
      ))}
    </View>
  );

  const renderConferencia = ({ item }: { item: any }) => {
    const totalItens = item.itens?.length || 0;
    const corretos =
      item.itens?.filter((i: any) => i.status === "correct").length || 0;
    const errados =
      item.itens?.filter((i: any) => i.status === "wrong").length || 0;
    const naoEncontrados =
      item.itens?.filter((i: any) => i.status === "not_found").length || 0;

    return (
      <TouchableOpacity
        onPress={() => {
          setConferenciaSelecionada(item);
          setModalVisible(true);
        }}
        style={[styles.tableDataRow, { paddingVertical: 10 }]}
      >
        <Text style={[styles.tableDataCell, { flex: 1.2 }]} numberOfLines={1}>
          #{item.id?.split("_")[1] || "N/A"}
        </Text>
        <Text style={[styles.tableDataCell, { flex: 1.2 }]} numberOfLines={1}>
          {formatarData(item.data)}
        </Text>
        <Text style={[styles.tableDataCell, { flex: 1, textAlign: "center" }]} numberOfLines={1}>
          {totalItens}
        </Text>
        <Text style={[styles.tableDataCell, { flex: 1, color: "#4F8A5B", textAlign: "center" }]} numberOfLines={1}>
          {corretos}
        </Text>
        <Text style={[styles.tableDataCell, { flex: 1, color: "#C8873A", textAlign: "center" }]} numberOfLines={1}>
          {errados}
        </Text>
        <Text style={[styles.tableDataCell, { flex: 1, color: "#C85C5C", textAlign: "center" }]} numberOfLines={1}>
          {naoEncontrados}
        </Text>
        <Text style={[styles.tableDataCell, { flex: 1.5 }]} numberOfLines={1}>
          {item.createdByEmail || "Desconhecido"}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderModal = () => {
    if (!conferenciaSelecionada) return null;

    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setConferenciaSelecionada(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <View
            style={[
              styles.card,
              { width: "100%", maxHeight: "80%", padding: 16 },
            ]}
          >
            <Text
              style={[styles.title, { marginBottom: 16, textAlign: "center" }]}
            >
              Conferência #{conferenciaSelecionada.id?.split("_")[1] || "N/A"}
            </Text>
            <Text
              style={{ textAlign: "center", marginBottom: 8, color: theme.colors.textMuted }}
            >
              Usuário: {conferenciaSelecionada.createdByEmail || "Desconhecido"}
            </Text>

            {/* Header da Planilha */}
            <View
              style={{
                marginBottom: 12,
                borderBottomWidth: 2,
                borderBottomColor: theme.colors.accent,
                paddingBottom: 8,
              }}
            >
              <View style={{ flexDirection: "row", gap: 4 }}>
                <Text
                  style={{
                    flex: 2,
                    fontWeight: "bold",
                    color: theme.colors.text,
                    fontSize: 11,
                  }}
                >
                  Item
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontWeight: "bold",
                    color: theme.colors.text,
                    fontSize: 11,
                  }}
                >
                  Sala
                </Text>
                <Text
                  style={{
                    flex: 1.2,
                    fontWeight: "bold",
                    color: theme.colors.text,
                    fontSize: 11,
                  }}
                >
                  Patrimônio
                </Text>
                <Text
                  style={{
                    flex: 0.8,
                    fontWeight: "bold",
                    color: "#4F8A5B",
                    textAlign: "center",
                    fontSize: 11,
                  }}
                >
                  Sim
                </Text>
                <Text
                  style={{
                    flex: 0.8,
                    fontWeight: "bold",
                    color: "#C8873A",
                    textAlign: "center",
                    fontSize: 11,
                  }}
                >
                  Fora
                </Text>
                <Text
                  style={{
                    flex: 0.8,
                    fontWeight: "bold",
                    color: "#C85C5C",
                    textAlign: "center",
                    fontSize: 11,
                  }}
                >
                  Não
                </Text>
              </View>
            </View>

            {/* Itens da Planilha */}
            <ScrollView style={{ maxHeight: "60%", marginBottom: 16 }}>
              {conferenciaSelecionada.itens &&
                conferenciaSelecionada.itens.map(
                  (itemConf: any, idx: number) => (
                    <View
                      key={idx}
                      style={{
                        paddingVertical: 6,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.border,
                      }}
                    >
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <Text style={{ flex: 2, color: theme.colors.text, fontSize: 11 }}>
                          {itemConf.itemNome}
                        </Text>
                        <Text style={{ flex: 1, color: theme.colors.textMuted, fontSize: 11 }}>
                          {itemConf.sala}
                        </Text>
                        <Text
                          style={{ flex: 1.2, color: theme.colors.textMuted, fontSize: 11 }}
                        >
                          {itemConf.patrimonio}
                        </Text>

                        <Text
                          style={{
                            flex: 0.8,
                            textAlign: "center",
                            color:
                              itemConf.status === "correct"
                                ? "#4F8A5B"
                                : theme.colors.textMuted,
                            fontSize: 12,
                          }}
                        >
                          {itemConf.status === "correct" ? "✓" : "-"}
                        </Text>
                        <Text
                          style={{
                            flex: 0.8,
                            textAlign: "center",
                            color:
                              itemConf.status === "wrong" ? "#C8873A" : theme.colors.textMuted,
                            fontSize: 12,
                          }}
                        >
                          {itemConf.status === "wrong" ? "✓" : "-"}
                        </Text>
                        <Text
                          style={{
                            flex: 0.8,
                            textAlign: "center",
                            color:
                              itemConf.status === "not_found"
                                ? "#C85C5C"
                                : theme.colors.textMuted,
                            fontSize: 12,
                          }}
                        >
                          {itemConf.status === "not_found" ? "✓" : "-"}
                        </Text>
                      </View>
                      {!!itemConf.observacao && (
                        <Text
                          style={{
                            marginTop: 6,
                            color: theme.colors.textMuted,
                            fontSize: 11,
                          }}
                        >
                          Observação: {itemConf.observacao}
                        </Text>
                      )}
                    </View>
                  )
                )}
            </ScrollView>

            {/* Botões */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <PaperButton
                mode="contained"
                onPress={() =>
                  navigation.navigate(
                    "Conferencia sala" as never,
                    { conferencia: conferenciaSelecionada } as never
                  )
                }
                style={{ flex: 1, backgroundColor: theme.colors.accent }}
                labelStyle={{ color: "#fff", fontSize: 12 }}
                disabled={
                  !adm &&
                  (conferenciaSelecionada.createdByUid !== auth.currentUser?.uid ||
                    (conferenciaSelecionada.timestamp &&
                      Date.now() - (
                        conferenciaSelecionada.timestamp.toDate
                          ? conferenciaSelecionada.timestamp.toDate().getTime()
                          : new Date(conferenciaSelecionada.timestamp).getTime()
                      ) <
                        1000 * 60 * 60))
                }
              >
                Editar
              </PaperButton>
              {adm && (
                <PaperButton
                  mode="contained"
                  onPress={() => deleteConferencia(conferenciaSelecionada.key)}
                  style={{ flex: 1, backgroundColor: "#C85C5C" }}
                  labelStyle={{ color: "#fff", fontSize: 12 }}
                >
                  Excluir
                </PaperButton>
              )}
              <PaperButton
                mode="outlined"
                onPress={() => {
                  setModalVisible(false);
                  setConferenciaSelecionada(null);
                }}
                style={{ flex: 1, borderColor: theme.colors.textMuted }}
                labelStyle={{ color: theme.colors.textMuted, fontSize: 12 }}
              >
                Fechar
              </PaperButton>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View
     style={[styles.container, {backgroundColor: theme.colors.background}]}
    >
      {renderModal()}
      <View style={{ width: "100%", marginLeft: 20, marginTop: 90 }}>
        <Header
          title="Conferências"
          showMenu={false}
          showBack={true}
          onLeftPress={() => navigation.navigate("Página Inicial" as never)}
        />

        <View style={styles.filterCard}>
          <Text
            style={{ fontWeight: "600", color: theme.colors.text, marginBottom: 8 }}
          >
            Filtrar por data (DD/MM/AAAA):
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Digite a data..."
            value={dataFiltro}
            onChangeText={filtrarPorData}
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.accent}
            textColor="#000000"
            placeholderTextColor="#000000"
            style={{ backgroundColor: theme.colors.surface }}
          />
        </View>
      </View>

      {filtradas.length === 0 ? (
        <View style={styles.tableEmptyContainer}>
          <Text style={styles.tableEmptyText}>Nenhuma conferência encontrada</Text>
        </View>
      ) : (
        <ScrollView 
          horizontal 
          style={styles.tableContainer}
          showsHorizontalScrollIndicator={false}
        >
          <View style={{ minWidth: 820 }}>
            <View style={{ flexDirection: "row" }}>
              <View
                style={[
                  styles.tableHeaderRow,
                  {
                    width: columnWidths.id,
                    alignItems: "center",
                    justifyContent: "center",
                    borderTopRightRadius: 0,
                  },
                  styles.tableColumnDivider,
                ]}
              >
                <Text style={styles.tableHeaderText}>ID</Text>
              </View>
              <View
                style={[
                  styles.tableHeaderRow,
                  {
                    width: columnWidths.data,
                    alignItems: "center",
                    justifyContent: "center",
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                  },
                  styles.tableColumnDivider,
                ]}
              >
                <Text style={styles.tableHeaderText}>Data</Text>
              </View>
              <View
                style={[
                  styles.tableHeaderRow,
                  {
                    width: columnWidths.total,
                    alignItems: "center",
                    justifyContent: "center",
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                  },
                  styles.tableColumnDivider,
                ]}
              >
                <Text style={styles.tableHeaderText}>Total</Text>
              </View>
              <View
                style={[
                  styles.tableHeaderRow,
                  {
                    width: columnWidths.corretos,
                    alignItems: "center",
                    justifyContent: "center",
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                  },
                  styles.tableColumnDivider,
                ]}
              >
                <Text style={styles.tableHeaderText}>✓</Text>
              </View>
              <View
                style={[
                  styles.tableHeaderRow,
                  {
                    width: columnWidths.errados,
                    alignItems: "center",
                    justifyContent: "center",
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                  },
                  styles.tableColumnDivider,
                ]}
              >
                <Text style={styles.tableHeaderText}>Fora</Text>
              </View>
              <View
                style={[
                  styles.tableHeaderRow,
                  {
                    width: columnWidths.nao,
                    alignItems: "center",
                    justifyContent: "center",
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                  },
                  styles.tableColumnDivider,
                ]}
              >
                <Text style={styles.tableHeaderText}>Não</Text>
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
                  
                  
                ]}
              >
                <Text style={styles.tableHeaderText}>Usuário</Text>
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
                "id",
                (item) => (
                  <Text
                    style={[styles.tableDataCell, styles.tableColumnText]}
                    numberOfLines={1}
                  >
                    #{item.id?.split("_")[1] || "N/A"}
                  </Text>
                ),
                { width: columnWidths.id },
                true
              )}

              {renderColumn(
                "data",
                (item) => (
                  <Text
                    style={[styles.tableDataCell, styles.tableColumnText]}
                    numberOfLines={1}
                  >
                    {formatarData(item.data)}
                  </Text>
                ),
                { width: columnWidths.data },
                true
              )}

              {renderColumn(
                "total",
                (item) => (
                  <Text
                    style={[styles.tableDataCell, styles.tableColumnText]}
                    numberOfLines={1}
                  >
                    {getCounts(item).totalItens}
                  </Text>
                ),
                { width: columnWidths.total },
                true
              )}

              {renderColumn(
                "corretos",
                (item) => (
                  <Text
                    style={[
                      styles.tableDataCell,
                      styles.tableColumnText,
                      { color: "#4F8A5B" },
                    ]}
                    numberOfLines={1}
                  >
                    {getCounts(item).corretos}
                  </Text>
                ),
                { width: columnWidths.corretos },
                true
              )}

              {renderColumn(
                "errados",
                (item) => (
                  <Text
                    style={[
                      styles.tableDataCell,
                      styles.tableColumnText,
                      { color: "#C8873A" },
                    ]}
                    numberOfLines={1}
                  >
                    {getCounts(item).errados}
                  </Text>
                ),
                { width: columnWidths.errados },
                true
              )}

              {renderColumn(
                "nao",
                (item) => (
                  <Text
                    style={[
                      styles.tableDataCell,
                      styles.tableColumnText,
                      { color: "#C85C5C" },
                    ]}
                    numberOfLines={1}
                  >
                    {getCounts(item).naoEncontrados}
                  </Text>
                ),
                { width: columnWidths.nao },
                true
              )}

              {renderColumn(
                "usuario",
                (item) => (
                  <Text
                    style={[styles.tableDataCell, styles.tableColumnText]}
                    numberOfLines={1}
                  >
                    {item.createdByEmail || "Desconhecido"}
                  </Text>
                ),
                { width: columnWidths.usuario },
                true
              )}

              {renderColumn(
                "acoes",
                (item) => (
                  <TouchableOpacity
                    onPress={() => {
                      setConferenciaSelecionada(item);
                      setModalVisible(true);
                    }}
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
