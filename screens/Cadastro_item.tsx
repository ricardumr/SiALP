import * as React from "react";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import {
  ArrowLeft,
  ChevronDown,
} from "lucide-react-native";
import { firestore } from "../firebase";
import { Item } from "../model/Item";
import { Sala } from "../model/Sala";
import { getCurrentUserContext } from "../model/userContext";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";

export default function Cadastro_item() {
  const navigation = useNavigation<any>();
  const route: any = useRoute();

  const [formItem, setFormItem] = useState<Partial<Item>>({});
  const [salas, setSalas] = useState<Sala[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [bancoId, setBancoId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserContext().then((context) => {
      if (context) setBancoId(context.bancoId);
    });
  }, []);

  useEffect(() => {
    if (route.params?.item) {
      setFormItem(route.params.item);
    }
  }, [route.params]);

  useEffect(() => {
    if (!bancoId) return;
    const refSala = firestore.collection("Usuario").doc(bancoId).collection("Sala");
    return refSala.onSnapshot((querySnapshot) => {
      const salasArray: Sala[] = [];
      querySnapshot.forEach((doc) => {
        salasArray.push(new Sala(doc.data() as Partial<Sala>));
      });
      setSalas(salasArray);
    });
  }, [bancoId]);

  useEffect(() => {
    if (!bancoId) return;
    const refItem = firestore.collection("Usuario").doc(bancoId).collection("Item");
    return refItem.onSnapshot((querySnapshot) => {
      const itensArray: Item[] = [];
      querySnapshot.forEach((doc) => {
        itensArray.push(new Item(doc.data() as Partial<Item>));
      });
      setItens(itensArray);
    });
  }, [bancoId]);

  const normalizeHeader = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const parseXLSX = (base64: string) => {
    const workbook = XLSX.read(base64, { type: "base64" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
  };

  const importarXLSX = async () => {
    try {
      if (!bancoId) {
        alert("Usuário não autenticado");
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const fileUri = result.assets?.[0]?.uri;
      if (!fileUri) {
        alert("Arquivo inválido");
        return;
      }

      const contentBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const rows = parseXLSX(contentBase64);
      if (rows.length === 0) {
        alert("Planilha vazia");
        return;
      }

      const header = rows[0].map((h) => normalizeHeader(String(h ?? "")));
      const findIndex = (exact: string[], contains: string[] = [], exclude: string[] = []) => {
        let idx = header.findIndex((h) => exact.includes(h));
        if (idx !== -1) return idx;
        if (!contains.length) return -1;
        return header.findIndex(
          (h) => contains.some((c) => h.includes(c)) && !exclude.some((e) => h.includes(e))
        );
      };

      const nomeIndex = findIndex(["nome", "descricao"], ["nome", "descricao"]);
      if (nomeIndex === -1) {
        alert("Coluna NOME/DESCRICAO não encontrada na planilha");
        return;
      }

      const estadoIndex = findIndex(["estado"]);
      const patrimonioIndex = findIndex(
        ["patrimonio", "numero"],
        ["patrimonio", "numero"],
        ["serie", "numerodeserie"]
      );
      const observacaoIndex = findIndex(["observacao", "obs"], ["observacao", "obs"]);
      const salaIndex = findIndex(["sala"]);

      const existentes = new Set(
        itens.map(
          (i) =>
            `${(i.nome || "").trim().toLowerCase()}|${(i.patrimonio || "")
              .trim()
              .toLowerCase()}|${(i.sala || "").trim().toLowerCase()}`
        )
      );
      const novos: Partial<Item>[] = [];
      const vistos = new Set<string>();

      for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i];
        const nome = String(row[nomeIndex] || "").trim();
        if (!nome) continue;

        const estado = estadoIndex >= 0 ? String(row[estadoIndex] || "").trim() : "";
        const patrimonio = patrimonioIndex >= 0 ? String(row[patrimonioIndex] || "").trim() : "";
        const sala = salaIndex >= 0 ? String(row[salaIndex] || "").trim() : "";

        if (!estado || !patrimonio || !sala) continue;

        const key = `${nome.toLowerCase()}|${patrimonio.toLowerCase()}|${sala.toLowerCase()}`;
        if (existentes.has(key) || vistos.has(key)) continue;
        vistos.add(key);

        novos.push({
          nome,
          estado,
          patrimonio,
          observacao: observacaoIndex >= 0 ? String(row[observacaoIndex] || "").trim() : "",
          sala,
        });
      }

      if (!novos.length) {
        alert("Nenhum item novo para cadastrar");
        return;
      }

      const refItem = firestore.collection("Usuario").doc(bancoId).collection("Item");
      const batchSize = 400;
      let totalCriados = 0;

      for (let i = 0; i < novos.length; i += batchSize) {
        const batch = firestore.batch();
        const slice = novos.slice(i, i + batchSize);
        slice.forEach((novo) => {
          const docRef = refItem.doc();
          const novoItem = new Item({
            id: docRef.id,
            nome: novo.nome || "",
            estado: novo.estado || "",
            patrimonio: novo.patrimonio || "",
            observacao: novo.observacao || "",
            sala: novo.sala || "",
          });
          batch.set(docRef, novoItem.toFirestore());
        });
        await batch.commit();
        totalCriados += slice.length;
      }

      alert(`Importação concluída. Itens cadastrados: ${totalCriados}`);
    } catch (error: any) {
      const message = (error && (error.message || error.toString())) || "Erro desconhecido";
      alert(`Não foi possível importar o XLSX: ${message}`);
    }
  };

  const cadastrar = () => {
    const nome = String(formItem.nome ?? "").trim();
    const estado = String(formItem.estado ?? "").trim();
    const patrimonio = String(formItem.patrimonio ?? "").trim();
    const observacao = String(formItem.observacao ?? "").trim();
    const sala = String(formItem.sala ?? "").trim();

    if (!nome || !estado || !patrimonio || !sala) {
      alert("Preencha os campos obrigatórios: Nome, Estado, Patrimônio e Sala.");
      return;
    }
    if (!bancoId) {
      alert("Usuário não autenticado");
      return;
    }

    const refItem = firestore.collection("Usuario").doc(bancoId).collection("Item");
    const novoItem = new Item({ ...formItem, nome, estado, patrimonio, observacao, sala });

    if (formItem.id) {
      refItem.doc(formItem.id).update(novoItem.toFirestore()).then(() => {
        alert("Cadastro atualizado");
      });
      return;
    }

    const idItem = refItem.doc();
    novoItem.id = idItem.id;
    idItem.set(novoItem.toFirestore());
    alert("Item adicionado com sucesso");
    setFormItem({});
  };

  return (
    <SafeAreaView style={localStyles.screen}>
      <View style={localStyles.bgRightCircle} />

      <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={localStyles.topRow}>
          <TouchableOpacity
            style={localStyles.backButton}
            onPress={() => {
              if (navigation?.canGoBack?.()) navigation.goBack();
              else navigation.openDrawer?.();
            }}
          >
            <ArrowLeft color="#e9f2f4" size={30} />
          </TouchableOpacity>
          <Text style={localStyles.topTitle}>Cadastro de Item</Text>
        </View>

        <View style={localStyles.card}>
          <Text style={localStyles.cardTitle}>Cadastro de Item</Text>
          <Text style={localStyles.cardSub}>Preencha os dados do item</Text>
          <View style={localStyles.separator} />

          <View style={localStyles.field}>
            <TextInput
              mode="flat"
              placeholder="Nome"
              placeholderTextColor="rgba(208,223,227,0.6)"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={localStyles.input}
              textColor="#eaf4f6"
              value={String(formItem.nome ?? "")}
              onChangeText={(valor) => setFormItem({ ...formItem, nome: valor })}
            />
          </View>

          <View style={localStyles.field}>
            <TextInput
              mode="flat"
              placeholder="Estado"
              placeholderTextColor="rgba(208,223,227,0.6)"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={localStyles.input}
              textColor="#eaf4f6"
              value={String(formItem.estado ?? "")}
              onChangeText={(valor) => setFormItem({ ...formItem, estado: valor })}
            />
          </View>

          <View style={localStyles.field}>
            <TextInput
              mode="flat"
              placeholder="Patrimônio"
              placeholderTextColor="rgba(208,223,227,0.6)"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={localStyles.input}
              textColor="#eaf4f6"
              value={String(formItem.patrimonio ?? "")}
              onChangeText={(valor) => setFormItem({ ...formItem, patrimonio: valor })}
            />
          </View>

          <View style={localStyles.field}>
            <TextInput
              mode="flat"
              placeholder="Observação (opcional)"
              placeholderTextColor="rgba(208,223,227,0.6)"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={localStyles.input}
              textColor="#eaf4f6"
              value={String(formItem.observacao ?? "")}
              onChangeText={(valor) => setFormItem({ ...formItem, observacao: valor })}
            />
          </View>

          <View style={localStyles.field}>
            <View style={localStyles.pickerRow}>
              <View style={{ flex: 1 }}>
                <Picker
                  mode="dialog"
                  selectedValue={formItem.sala || ""}
                  onValueChange={(valor) => setFormItem({ ...formItem, sala: valor })}
                  dropdownIconColor="#e9f2f4"
                  style={localStyles.picker}
                >
                  <Picker.Item label="Selecione uma sala" value="" />
                  {salas.map((sala) => (
                    <Picker.Item key={sala.id} label={sala.nome} value={sala.nome} />
                  ))}
                </Picker>
              </View>
              <ChevronDown color="#e9f2f4" size={24} />
            </View>
          </View>

          <TouchableOpacity style={localStyles.saveButton} onPress={cadastrar} activeOpacity={0.92}>
            <Text style={localStyles.saveButtonText}>Salvar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={localStyles.importButton}
            onPress={importarXLSX}
            activeOpacity={0.92}
          >
            <Text style={localStyles.importButtonText}>Importar XLSX</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#053943",
  },
  bgRightCircle: {
    position: "absolute",
    top: -70,
    right: -150,
    width: 420,
    height: 420,
    borderRadius: 210,
    borderWidth: 1,
    borderColor: "rgba(120,208,210,0.2)",
    backgroundColor: "rgba(13,93,102,0.22)",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  topRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(12,95,99,0.48)",
    borderWidth: 1,
    borderColor: "rgba(110,198,197,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  topTitle: {
    color: "#edf4f5",
    fontSize: 19,
    fontWeight: "800",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(118,208,210,0.32)",
    backgroundColor: "rgba(3,56,64,0.46)",
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 10,
  },
  cardTitle: {
    color: "#edf4f5",
    textAlign: "center",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 10,
  },
  cardSub: {
    color: "#2dd3b5",
    fontSize: 16,
    marginBottom: 12,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(118,208,210,0.26)",
    marginBottom: 10,
  },
  field: {
    minHeight: 66,
    borderWidth: 1,
    borderColor: "rgba(147,210,214,0.4)",
    borderRadius: 16,
    backgroundColor: "rgba(4,52,60,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "transparent",
    fontSize: 17,
    paddingHorizontal: 0,
    minHeight: 58,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  picker: {
    color: "#eaf4f6",
    backgroundColor: "transparent",
    marginLeft: -8,
  },
  saveButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#1ce8b1",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 6,
  },
  saveButtonText: {
    color: "#001a20",
    fontSize: 20,
    fontWeight: "800",
  },
  importButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1.4,
    borderColor: "#18f4bc",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  importButtonText: {
    color: "#18f4bc",
    fontSize: 18,
    fontWeight: "700",
  },
});
