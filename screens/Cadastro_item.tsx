import * as React from "react";
import {
  StyleSheet,
  Text,
  View,
  Button,
  TouchableOpacity,
  Image,
  ImageBackground,
} from "react-native";
import { NavigationContainer, useRoute } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import styles, { theme } from "../estilo";
import { useState } from "react";
import { auth, firestore } from "../firebase";
import { TextInput } from "react-native-paper";
import { Item } from "../model/Item";
import { useEffect } from "react";
import { Picker } from "@react-native-picker/picker";
import Header from "../components/Header";
import { Sala } from "../model/Sala";
import { getCurrentUserContext } from "../model/userContext";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";
import { white } from "react-native-paper/lib/typescript/styles/themes/v2/colors";

export default function Cadastro_item() {
  const [formItem, setFormItem] = useState<Partial<Item>>({});
  const [salas, setSalas] = useState<Sala[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [bancoId, setBancoId] = useState<string | null>(null);

  const route = useRoute();

  useEffect(() => {
    getCurrentUserContext().then((context) => {
      if (context) setBancoId(context.bancoId);
    });
  }, []);

  useEffect(() => {
    //recebe objeto item para editar
    if (route.params) {
      setFormItem(route.params.item);
    }
  }, [route.params]); //depois usar isso no picker no sala: selectedValue={formSala.usuario}

  useEffect(() => {
    //carrega as salas cadastradas
    if (!bancoId) return;
    const refSala = firestore
      .collection("Usuario")
      .doc(bancoId)
      .collection("Sala");

    refSala.onSnapshot((querySnapshot) => {
      const salasArray: Sala[] = [];
      querySnapshot.forEach((doc) => {
        salasArray.push(new Sala(doc.data() as Partial<Sala>));
      });
      setSalas(salasArray);
    });
  }, [bancoId]);

  useEffect(() => {
    //carrega os itens cadastrados para validação
    if (!bancoId) return;
    const refItem = firestore
      .collection("Usuario")
      .doc(bancoId)
      .collection("Item");

    refItem.onSnapshot((querySnapshot) => {
      const itensArray: Item[] = [];
      querySnapshot.forEach((doc) => {
        itensArray.push(new Item(doc.data() as Partial<Item>));
      });
      setItens(itensArray);
    });
  }, [bancoId]);

  const navigation = useNavigation();

  const cadastroColors = {
    background: "#376f6c",
    surface: "#224846",
    accent: "#19f59d",
    text: "#e2e8f0",
  };

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
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
    return rows;
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
      const findIndex = (
        exact: string[],
        contains: string[] = [],
        exclude: string[] = []
      ) => {
        let idx = header.findIndex((h) => exact.includes(h));
        if (idx !== -1) return idx;
        if (contains.length === 0) return -1;
        return header.findIndex(
          (h) =>
            contains.some((c) => h.includes(c)) &&
            !exclude.some((e) => h.includes(e))
        );
      };

      const nomeIndex = findIndex(
        ["nome", "descricao"],
        ["nome", "descricao"]
      );
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
      const observacaoIndex = findIndex(
        ["observacao", "obs"],
        ["observacao", "obs"]
      );
      const salaIndex = findIndex(["sala"]);

      const existentes = new Set(
        itens.map((i) =>
          `${(i.nome || "").trim().toLowerCase()}|${(i.patrimonio || "")
            .trim()
            .toLowerCase()}|${(i.sala || "").trim().toLowerCase()}`
        )
      );
      const novos: Partial<Item>[] = [];
      const vistos = new Set<string>();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const nome = (row[nomeIndex] || "").toString().trim();
        if (!nome) continue;

        const estado =
          estadoIndex >= 0 ? (row[estadoIndex] || "").toString().trim() : "";
        const patrimonio =
          patrimonioIndex >= 0
            ? (row[patrimonioIndex] || "").toString().trim()
            : "";
        const sala =
          salaIndex >= 0 ? (row[salaIndex] || "").toString().trim() : "";

        if (!estado || !patrimonio || !sala) {
          continue;
        }

        const key = `${nome.toLowerCase()}|${patrimonio.toLowerCase()}|${sala.toLowerCase()}`;
        if (existentes.has(key) || vistos.has(key)) continue;
        vistos.add(key);

        novos.push({
          nome,
          estado,
          patrimonio,
          observacao:
            observacaoIndex >= 0
              ? (row[observacaoIndex] || "").toString().trim()
              : "",
          sala,
        });
      }

      if (novos.length === 0) {
        alert("Nenhum item novo para cadastrar");
        return;
      }

      const refItem = firestore
        .collection("Usuario")
        .doc(bancoId)
        .collection("Item");

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
      const message =
        (error && (error.message || error.toString())) ||
        "Erro desconhecido";
      alert(`Não foi possível importar o XLSX: ${message}`);
      console.log("Erro ", error);
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

    const refItem = firestore
      .collection("Usuario")
      .doc(bancoId)
      .collection("Item");

    const novoItem = new Item({
      ...formItem,
      nome,
      estado,
      patrimonio,
      observacao,
      sala,
    });
    if (formItem.id) {
      const idItem = refItem.doc(formItem.id);
      idItem.update(novoItem.toFirestore()).then(() => {
        alert("Cadastro atualizado");
      });
    } else {
      const idItem = refItem.doc();
      novoItem.id = idItem.id;
      idItem.set(novoItem.toFirestore());
      alert("Item adicionado com sucesso");
      setFormItem({});
    }
  };
  return (
    <View
      style={[styles.container, { backgroundColor: cadastroColors.background }]}
    >
      <Header title="Cadastro de Item" showMenu={true} />
      <View style={[styles.formCard, { backgroundColor: cadastroColors.surface }]}>
        <Text style={[styles.titulo, { color: cadastroColors.text }]}>
          Cadastro de Item
        </Text>

        <TextInput
          mode="outlined"
          placeholder="Nome"
          style={[styles.inputOutlined, { backgroundColor: cadastroColors.surface, color: "#fff" }]}
          outlineColor="#fff"
          activeOutlineColor={cadastroColors.accent}
          textColor="#fff"
          placeholderTextColor="#fff"
          onChangeText={(valor) => setFormItem({ ...formItem, nome: valor })}
          value={formItem.nome}
        />

        <TextInput
          mode="outlined"
          placeholder="Estado"
          style={[styles.inputOutlined, { backgroundColor: cadastroColors.surface, color: "#fff" }]}
          outlineColor="#fff"
          activeOutlineColor={cadastroColors.accent}
          textColor="#fff"
          placeholderTextColor="#fff"
          onChangeText={(valor) => setFormItem({ ...formItem, estado: valor })}
          value={formItem.estado}
        />

        <TextInput
          mode="outlined"
          placeholder="Patrimônio"
          style={[styles.inputOutlined, { backgroundColor: cadastroColors.surface, color: "#fff" }]}
          outlineColor="#fff"
          activeOutlineColor={cadastroColors.accent}
          textColor="#fff"
          placeholderTextColor="#fff"
          onChangeText={(valor) =>
            setFormItem({ ...formItem, patrimonio: valor })
          }
          value={String(formItem.patrimonio ?? "")}
        />

        <TextInput
          mode="outlined"
          placeholder="Observação"
          style={[styles.inputOutlined, { backgroundColor: cadastroColors.surface, color: "#fff" }]}
          outlineColor="#fff"
          activeOutlineColor={cadastroColors.accent}
          textColor="#fff"
          placeholderTextColor="#fff"
          onChangeText={(valor) =>
            setFormItem({ ...formItem, observacao: valor })
          }
          value={formItem.observacao}
        />

        <View
          style={[
            styles.selectWrapper,
            { borderColor: "#fff", backgroundColor: cadastroColors.surface },
          ]}
        >
          <Picker
            mode="dialog"
            onValueChange={(valor) => setFormItem({ ...formItem, sala: valor })}
            selectedValue={formItem.sala}
            style={{ color: "#fff" }}
          >
            <Picker.Item label="Selecione uma sala..." value="" />
            {salas.map((sala) => (
              <Picker.Item key={sala.id} label={sala.nome} value={sala.nome} />
            ))}
          </Picker>
        </View>

        <View style={styles.formActions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: cadastroColors.accent }]}
            onPress={cadastrar}
          >
            <Text style={styles.primaryButtonText}>Salvar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondButton, { backgroundColor: cadastroColors.surface }]}
            onPress={importarXLSX}
          >
            <Text style={styles.secondButtonText}>Importar XLSX</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
