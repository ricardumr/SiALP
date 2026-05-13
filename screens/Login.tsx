import { StatusBar } from "expo-status-bar";
import {
  Button,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  ImageBackground,
  TextInput
} from "react-native";
import { useState } from "react";
import { auth } from "../firebase";
import { useNavigation } from "@react-navigation/native";
import styles, { theme } from "../estilo";
// import { TextInput } from "react-native-paper";
import Header from "../components/Header";
import { black } from "react-native-paper/lib/typescript/styles/themes/v2/colors";

export default function Login() {
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const logar = () => {
    auth
      .signInWithEmailAndPassword(email, senha)
      .then((userCredentials) => {
        console.log("Logado como:", userCredentials.user.email);
        navigation.replace("Menu");
      })
      .catch((erro) => alert(erro.message));
  };

  const loginColors = {
    background: "#376f6c",
    surface: "#224846",
    accent: "#19f59d",
    text: "#e2e8f0",
    border: "#2c4a48",
  };

  return (
    <View
      style={[styles.container, { backgroundColor: loginColors.background }]}
    >

      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <View style={{width: "90%", alignItems: "center", justifyContent: "center", backgroundColor: loginColors.surface, marginLeft:10, marginRight:10, borderRadius: 10, padding: 20}}>
        <Header title="Login" showMenu={false} showBack={false} />

        <View style={[styles.formCard, {backgroundColor: loginColors.surface, elevation: 0, padding: 0}]}>
          <TextInput
          placeholder="Email"
            style={[styles.inputOutlined, { borderWidth: 1, borderColor: "#fff", color: "#fff", backgroundColor: loginColors.surface }]}
            placeholderTextColor="#fff"
            onChangeText={(email) => setEmail(email)}
            value={email}
          />
          <TextInput
            placeholder="Senha"
            style={[styles.inputOutlined, { borderWidth: 1, borderColor: "#fff", color: "#fff", backgroundColor: loginColors.surface }]}
            placeholderTextColor="#fff"
            secureTextEntry={true}
            onChangeText={(senha) => setSenha(senha)}
            value={senha}
          />
          <View style={styles.formActions}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: loginColors.accent,
                  width: "100%",
                  minWidth: 260,
                  alignItems: "center",
                },
              ]}
              onPress={logar}
            >
              <Text style={[styles.primaryButtonText, { color: "black" }]}>Acessar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.secondButton,
                {
                  backgroundColor: loginColors.surface,
                  width: "100%",
                  minWidth: 260,
                  alignItems: "center",
                  borderColor: loginColors.accent,
                },
              ]}
              onPress={() => navigation.navigate("Cadastro usuário" as never)}
            >
              <Text style={[styles.secondButtonText, { color: "#fff" }]}>Criar conta</Text>
            </TouchableOpacity>

          </View>
        </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
