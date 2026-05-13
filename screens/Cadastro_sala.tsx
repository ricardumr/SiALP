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
import { Sala } from "../model/Sala"; 
import { Usuario } from "../model/Usuario";
import { useEffect } from "react";
import { Picker } from "@react-native-picker/picker";
import Header from "../components/Header";
import { getCurrentUserContext } from "../model/userContext";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";

export default function Cadastro_sala() {
  const [formSala, setFormSala] = useState<Partial<Sala>>({});
  const [salas, setSalas] = useState<Sala[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [bancoId, setBancoId] = useState<string | null>(null);

  const route = useRoute();

  useEffect(() => {
    getCurrentUserContext().then((context) => {
      if (context) setBancoId(context.bancoId);
    });
  }, []);

  useEffect(() => {
    //recebe objeto sala para editar
    if (route.params) {
      setFormSala(route.params.sala);
    }
  }, [route.params]); //depois usar isso no picker no sala: selectedValue={formSala.usuario}

  useEffect(() => {
    //carrega as salas cadastradas para validação
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
    //carrega os usuários para seleção
    if (!bancoId) return;
    const refUsuarios = firestore
      .collection("Usuario")
      .where("bancoId", "==", bancoId);

    refUsuarios.onSnapshot((querySnapshot) => {
      const usuariosArray: Usuario[] = [];
      querySnapshot.forEach((doc) => {
        usuariosArray.push(
          new Usuario({ ...(doc.data() as Partial<Usuario>), id: doc.id })
        );
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
      const salaIndex = header.findIndex((h) => h === "sala");
      if (salaIndex === -1) {
        alert("Coluna SALA não encontrada na planilha");
        return;
      }

      const existentes = new Set(
        salas.map((s) => (s.nome || "").trim().toLowerCase())
      );
      const novos: string[] = [];
      const vistos = new Set<string>();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const nomeSala = (row[salaIndex] || "").trim();
        if (!nomeSala) continue;
        const key = nomeSala.toLowerCase();
        if (existentes.has(key) || vistos.has(key)) continue;
        vistos.add(key);
        novos.push(nomeSala);
      }

      if (novos.length === 0) {
        alert("Nenhuma sala nova para cadastrar");
        return;
      }

      const refSala = firestore
        .collection("Usuario")
        .doc(bancoId)
        .collection("Sala");

      const batchSize = 400;
      let totalCriadas = 0;

      for (let i = 0; i < novos.length; i += batchSize) {
        const batch = firestore.batch();
        const slice = novos.slice(i, i + batchSize);
        slice.forEach((nome) => {
          const docRef = refSala.doc();
          const novaSala = new Sala({
            id: docRef.id,
            nome,
            usuario: "",
          });
          batch.set(docRef, novaSala.toFirestore());
        });
        await batch.commit();
        totalCriadas += slice.length;
      }

      alert(`Importação concluída. Salas cadastradas: ${totalCriadas}`);
    } catch (error) {
      alert("Não foi possível importar o XLSX");
    }
  };

  const cadastrar = () => {
    if (!bancoId) {
      alert("Usuário não autenticado");
      return;
    }

    const refSala = firestore
      .collection("Usuario")
      .doc(bancoId)
      .collection("Sala");

    // Validação de nome vazio
    if (!formSala.nome || formSala.nome.trim() === "") {
      alert("Por favor, insira um nome para a sala");
      return;
    }

    // Validação de duplicação de nome (apenas para novas salas)
    if (!formSala.id) {
      const nomeDuplicado = salas.some(
        (sala) => sala.nome.toLowerCase() === formSala.nome.toLowerCase()
      );
      if (nomeDuplicado) {
        alert(
          "Já existe uma sala com este nome. Por favor, escolha outro nome."
        );
        return;
      }
    }

    const novoSala = new Sala(formSala);
    if (formSala.id) {
      const idSala = refSala.doc(formSala.id);
      idSala.update(novoSala.toFirestore()).then(() => {
        alert("Cadastro atualizado");
      });
    } else {
      const idSala = refSala.doc();
      novoSala.id = idSala.id;
      idSala.set(novoSala.toFirestore());
      alert("Sala adicionado com sucesso");
      setFormSala({});
    }
  };

  return (
    <View
      
      style={[styles.container, { backgroundColor: cadastroColors.background }]}
    >
      <Header title="Cadastro de Sala" showMenu={true} />

      <View style={[styles.formCard, { backgroundColor: cadastroColors.surface }]}>
        <Text style={[styles.titulo, { color: cadastroColors.text }]}>
          Cadastro de Sala
        </Text>

        <TextInput
          mode="outlined"
          placeholder="Nome"
          style={[styles.inputOutlined, { backgroundColor: cadastroColors.surface, color: "#fff" }]}
          outlineColor="#fff"
          activeOutlineColor={cadastroColors.accent}
          textColor="#fff"
          placeholderTextColor="#fff"
          onChangeText={(valor) => setFormSala({ ...formSala, nome: valor })}
          value={formSala.nome}
        />

        <View
          style={[
            styles.selectWrapper,
            { borderColor: "#fff", backgroundColor: cadastroColors.surface },
          ]}
        >
          <Picker
            mode="dialog"
            onValueChange={(valor) => setFormSala({ ...formSala, usuario: valor })}
            selectedValue={formSala.usuario || ""}
            style={{ color: "#fff" }}
          >
            <Picker.Item label="Selecione um usuário (opcional)..." value="" />
            {usuarios.map((user) => (
              <Picker.Item
                key={user.id}
                label={user.nome}
                value={user.id}
              />
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
