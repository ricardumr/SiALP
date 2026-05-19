import * as React from "react";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import {
  ArrowLeft,
  DoorOpen,
  Save,
  User,
  UserRound,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react-native";
import { firestore } from "../firebase";
import { Sala } from "../model/Sala";
import { Usuario } from "../model/Usuario";
import { getCurrentUserContext } from "../model/userContext";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";

export default function Cadastro_sala() {
  const navigation = useNavigation<any>();
  const route: any = useRoute();

  const [formSala, setFormSala] = useState<Partial<Sala>>({});
  const [salas, setSalas] = useState<Sala[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [bancoId, setBancoId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserContext().then((context) => {
      if (context) setBancoId(context.bancoId);
    });
  }, []);

  useEffect(() => {
    if (route.params?.sala) {
      setFormSala(route.params.sala);
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
    const refUsuarios = firestore.collection("Usuario").where("bancoId", "==", bancoId);
    return refUsuarios.onSnapshot((querySnapshot) => {
      const usuariosArray: Usuario[] = [];
      querySnapshot.forEach((doc) => {
        usuariosArray.push(new Usuario({ ...(doc.data() as Partial<Usuario>), id: doc.id }));
      });
      setUsuarios(usuariosArray);
    });
  }, [bancoId]);

  useEffect(() => {
    if (!formSala.usuario || !usuarios.length) return;
    const usuarioAtual = String(formSala.usuario).trim();
    const existsById = usuarios.some((u) => u.id === usuarioAtual);
    if (existsById) return;

    const match = usuarios.find(
      (u) => String(u.nome || "").trim().toLowerCase() === usuarioAtual.toLowerCase()
    );
    if (match?.id) {
      setFormSala((prev) => ({ ...prev, usuario: match.id }));
    }
  }, [formSala.usuario, usuarios]);

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
      if (!rows.length) {
        alert("Planilha vazia");
        return;
      }

      const header = rows[0].map((h) => normalizeHeader(String(h ?? "")));
      const salaIndex = header.findIndex((h) => h === "sala");
      if (salaIndex === -1) {
        alert("Coluna SALA não encontrada na planilha");
        return;
      }

      const existentes = new Set(salas.map((s) => (s.nome || "").trim().toLowerCase()));
      const novos: string[] = [];
      const vistos = new Set<string>();

      for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i];
        const nomeSala = String(row[salaIndex] || "").trim();
        if (!nomeSala) continue;
        const key = nomeSala.toLowerCase();
        if (existentes.has(key) || vistos.has(key)) continue;
        vistos.add(key);
        novos.push(nomeSala);
      }

      if (!novos.length) {
        alert("Nenhuma sala nova para cadastrar");
        return;
      }

      const refSala = firestore.collection("Usuario").doc(bancoId).collection("Sala");
      const batchSize = 400;
      let totalCriadas = 0;

      for (let i = 0; i < novos.length; i += batchSize) {
        const batch = firestore.batch();
        const slice = novos.slice(i, i + batchSize);
        slice.forEach((nome) => {
          const docRef = refSala.doc();
          const novaSala = new Sala({ id: docRef.id, nome, usuario: "" });
          batch.set(docRef, novaSala.toFirestore());
        });
        await batch.commit();
        totalCriadas += slice.length;
      }

      alert(`Importação concluída. Salas cadastradas: ${totalCriadas}`);
    } catch {
      alert("Não foi possível importar o XLSX");
    }
  };

  const cadastrar = () => {
    if (!bancoId) {
      alert("Usuário não autenticado");
      return;
    }

    const refSala = firestore.collection("Usuario").doc(bancoId).collection("Sala");

    if (!formSala.nome || formSala.nome.trim() === "") {
      alert("Por favor, insira um nome para a sala");
      return;
    }

    if (!formSala.id) {
      const nomeDuplicado = salas.some(
        (sala) => sala.nome.toLowerCase() === String(formSala.nome).toLowerCase()
      );
      if (nomeDuplicado) {
        alert("Já existe uma sala com este nome. Por favor, escolha outro nome.");
        return;
      }
    }

    const novoSala = new Sala(formSala);
    if (formSala.id) {
      refSala
        .doc(formSala.id)
        .update(novoSala.toFirestore())
        .then(() => alert("Cadastro atualizado"));
      return;
    }

    const idSala = refSala.doc();
    novoSala.id = idSala.id;
    idSala.set(novoSala.toFirestore());
    alert("Sala adicionada com sucesso");
    setFormSala({});
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
          <Text style={localStyles.topTitle}>Cadastro de Sala</Text>
        </View>

        <View style={localStyles.card}>
          <View style={localStyles.iconWrap}>
            <DoorOpen color="#16f2ba" size={34} />
          </View>

          <Text style={localStyles.cardTitle}>Cadastro de Sala</Text>
          <Text style={localStyles.cardSub}>Preencha os dados da sala</Text>
          <View style={localStyles.separator} />

          <Text style={localStyles.label}>Nome</Text>
          <View style={localStyles.field}>
            <User color="#18f4bc" size={24} />
            <TextInput
              mode="flat"
              placeholder="Digite o nome da sala"
              placeholderTextColor="rgba(208,223,227,0.55)"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={localStyles.input}
              textColor="#eaf4f6"
              value={String(formSala.nome ?? "")}
              onChangeText={(valor) => setFormSala({ ...formSala, nome: valor })}
            />
          </View>

          <Text style={localStyles.label}>Usuário (opcional)</Text>
          <View style={localStyles.field}>
            <UserRound color="#18f4bc" size={24} />
            <View style={{ flex: 1 }}>
              <Picker
                mode="dialog"
                selectedValue={formSala.usuario || ""}
                onValueChange={(valor) => setFormSala({ ...formSala, usuario: valor })}
                dropdownIconColor="#e9f2f4"
                style={localStyles.picker}
              >
                <Picker.Item label="Selecione um usuário (opcional)" value="" />
                {usuarios.map((user) => (
                  <Picker.Item key={user.id} label={user.nome} value={user.id} />
                ))}
              </Picker>
            </View>
            <ChevronDown color="#e9f2f4" size={24} />
          </View>

          <View style={localStyles.separatorBottom} />

          <TouchableOpacity style={localStyles.saveButton} onPress={cadastrar} activeOpacity={0.92}>
            <Save color="#03242c" size={24} />
            <Text style={localStyles.saveButtonText}>Salvar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={localStyles.importButton}
            onPress={importarXLSX}
            activeOpacity={0.92}
          >
            <FileSpreadsheet color="#18f4bc" size={26} />
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
    paddingBottom: 18,
  },
  topRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(12,95,99,0.48)",
    borderWidth: 1,
    borderColor: "rgba(110,198,197,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  topTitle: {
    color: "#edf4f5",
    fontSize: 21,
    fontWeight: "800",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(118,208,210,0.32)",
    backgroundColor: "rgba(3,56,64,0.46)",
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: "rgba(76,214,201,0.45)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
    backgroundColor: "rgba(7,79,87,0.35)",
  },
  cardTitle: {
    color: "#edf4f5",
    textAlign: "center",
    fontSize: 36,
    fontWeight: "800",
  },
  cardSub: {
    color: "rgba(212,226,230,0.9)",
    textAlign: "center",
    marginTop: 6,
    fontSize: 15,
    marginBottom: 8,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(120,208,210,0.28)",
    marginTop: 8,
    marginBottom: 10,
  },
  label: {
    color: "#18f4bc",
    fontSize: 14,
    marginBottom: 6,
  },
  field: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: "rgba(147,210,214,0.4)",
    borderRadius: 16,
    backgroundColor: "rgba(4,52,60,0.45)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "transparent",
    fontSize: 14,
    marginLeft: 8,
  },
  picker: {
    color: "#eaf4f6",
    backgroundColor: "transparent",
    marginLeft: 6,
  },
  separatorBottom: {
    height: 1,
    backgroundColor: "rgba(120,208,210,0.28)",
    marginTop: 4,
    marginBottom: 10,
  },
  saveButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#1be8b3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  saveButtonText: {
    color: "#03242c",
    fontSize: 17,
    fontWeight: "800",
  },
  importButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1.4,
    borderColor: "#18f4bc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  importButtonText: {
    color: "#18f4bc",
    fontSize: 16,
    fontWeight: "700",
  },
});
