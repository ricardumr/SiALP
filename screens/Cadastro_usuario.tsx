import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Button,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { auth, firestore } from "../firebase";
import styles from "../estilo";
import { TextInput } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import { Usuario } from "../model/Usuario";
import Header from "../components/Header";

export default function Cadastro_usuario() {
  const [formUsuario, setFormUsuario] = useState<Partial<Usuario>>({});

  const cadastroColors = {
    background: "#376f6c",
    surface: "#224846",
    accent: "#19f59d",
    text: "#e2e8f0",
  };

  const inputTheme = {
    colors: {
      primary: cadastroColors.accent,
      onSurface: "#fff",
      onSurfaceVariant: "#fff",
      placeholder: "#fff",
    },
  };

  const cadastrar = () => {
    auth
      .createUserWithEmailAndPassword(formUsuario.email, formUsuario.senha)
      .then((userCredentials) => {
        console.log("Logado como:", userCredentials.user?.email);
        navigation.replace("Menu");

        const refUsuario = firestore.collection("Usuario");
        const idUsuario = refUsuario.doc(auth.currentUser.uid);
        idUsuario.set({
          id: auth.currentUser.uid,
          nome: formUsuario.nome,
          email: formUsuario.email,
          senha: formUsuario.senha,
          adm: formUsuario.adm ?? false,
        });
      })
      .catch((erro) => alert(erro.message));
  };


  return (
    <View
      style={[styles.container, { backgroundColor: cadastroColors.background }]}
    >
      <Header title="Cadastrar Usuário" showMenu={false} />

      <View style={[styles.formCard, { backgroundColor: cadastroColors.surface }]}>
        <Text style={[styles.titulo, { color: cadastroColors.text }]}>
          Cadastro de usuários
          </Text>

          <TextInput
            mode="outlined"
            placeholder="Nome"
            style={[styles.inputOutlined, { backgroundColor: cadastroColors.surface, color: "#fff" }]}
          outlineColor="#fff"
          activeOutlineColor={cadastroColors.accent}
          textColor="#fff"
          placeholderTextColor="#fff"
          cursorColor="#fff"
          selectionColor="#fff"
          theme={inputTheme}
          onChangeText={(valor) =>
            setFormUsuario({ ...formUsuario, nome: valor })
          }
        />

        <TextInput
          mode="outlined"
          label="Email"
          style={[styles.inputOutlined, { backgroundColor: cadastroColors.surface, color: "#fff" }]}
          outlineColor="#fff"
          activeOutlineColor={cadastroColors.accent}
          textColor="#fff"
          placeholderTextColor="#fff"
          cursorColor="#fff"
          selectionColor="#fff"
          theme={inputTheme}
          onChangeText={(valor) =>
            setFormUsuario({ ...formUsuario, email: valor })
          }
        />


        

        <TextInput
          mode="outlined"
          label="Senha"
          secureTextEntry={true}
          style={[styles.inputOutlined, { backgroundColor: cadastroColors.surface, color: "#fff" }]}
          outlineColor="#fff"
          activeOutlineColor={cadastroColors.accent}
          textColor="#fff"
          placeholderTextColor="#fff"
          cursorColor="#fff"
          selectionColor="#fff"
          theme={inputTheme}
          onChangeText={(valor) =>
            setFormUsuario({ ...formUsuario, senha: valor })
          }
        />

        {auth.currentUser ? (
        <View
          style={[
            styles.selectWrapper,
            { borderColor: "#fff", backgroundColor: cadastroColors.surface },
          ]}
        >
          <Picker
            mode="dialog"
            onValueChange={(valor) =>
              setFormUsuario({ ...formUsuario, adm: valor === "true" })
            }
            selectedValue={
              formUsuario.adm === true
                ? "true"
                : formUsuario.adm === false
                ? "false"
                : ""
            }
            style={{ color: "#fff" }}
          >
            <Picker.Item label="Selecione um tipo de usuário..." value="" />
            <Picker.Item label="Administrador" value="true" />
            <Picker.Item label="Servidor público" value="false" />
          </Picker>
        </View>
        ) : null}

</View>
        <View style={styles.formActions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: cadastroColors.accent }]}
            onPress={cadastrar}
          >
            <Text style={styles.primaryButtonText}>Salvar</Text>
          </TouchableOpacity>

        </View>
      
    </View>
  );
}
