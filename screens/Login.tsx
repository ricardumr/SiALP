import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Box, Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react-native";
import { auth } from "../firebase";

export default function Login() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const logar = () => {
    auth
      .signInWithEmailAndPassword(email, senha)
      .then(() => navigation.replace("Menu"))
      .catch((erro) => alert(erro.message));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.bgLayer}>
        <View style={styles.glowTopRight} />
        <View style={styles.glowBottom} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.brandWrap}>
            <View style={styles.logoRing}>
              <Box color="#1af7bb" size={42} />
            </View>
            <Text style={styles.brandTitle}>SiALP</Text>
            <Text style={styles.brandSubtitle}>
              Sistema Automatizado{"\n"}levantamento patrimonial
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Login</Text>
            <Text style={styles.cardSubtitle}>Acesse sua conta para continuar</Text>

            <View style={styles.inputBox}>
              <View style={styles.inputIconBg}>
                <Mail color="#19f5b8" size={20} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(227,237,240,0.72)"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputBox}>
              <View style={styles.inputIconBg}>
                <Lock color="#19f5b8" size={20} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="rgba(227,237,240,0.72)"
                secureTextEntry={!mostrarSenha}
                value={senha}
                onChangeText={setSenha}
              />
              <TouchableOpacity
                onPress={() => setMostrarSenha((v) => !v)}
                style={styles.eyeButton}
                activeOpacity={0.8}
              >
                {mostrarSenha ? (
                  <EyeOff color="rgba(227,237,240,0.8)" size={24} />
                ) : (
                  <Eye color="rgba(227,237,240,0.8)" size={24} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={logar} activeOpacity={0.9}>
              <Text style={styles.btnPrimaryText}>Acessar</Text>
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>ou</Text>
              <View style={styles.orLine} />
            </View>

            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => navigation.navigate("Cadastro usuário")}
              activeOpacity={0.9}
            >
              <UserRound color="#19f5b8" size={28} />
              <Text style={styles.btnOutlineText}>Criar conta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#032f39",
  },
  flex: {
    flex: 1,
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#032f39",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 24,
  },
  brandWrap: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 30,
  },
  logoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 8,
    borderColor: "rgba(14,180,170,0.2)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(12,75,80,0.45)",
    marginBottom: 1,
  },
  brandTitle: {
    fontSize: 52,
    color: "#edf3f5",
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    marginTop: 6,
    color: "rgba(217,231,235,0.82)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    width: "100%",
    borderRadius: 26,
    borderWidth: 1.2,
    borderColor: "rgba(190,225,227,0.28)",
    backgroundColor: "rgba(4,48,58,0.67)",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    shadowColor: "#001216",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 16,
  },
  cardTitle: {
    textAlign: "center",
    color: "#eef4f6",
    fontSize: 46,
    fontWeight: "800",
  },
  cardSubtitle: {
    textAlign: "center",
    color: "rgba(221,232,236,0.8)",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  inputBox: {
    minHeight: 66,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(190,225,227,0.4)",
    backgroundColor: "rgba(2,34,42,0.45)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(8,94,97,0.42)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#eef4f6",
    fontSize: 14,
    paddingVertical: 6,
  },
  eyeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    marginTop: 4,
    minHeight: 62,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1de3ae",
  },
  btnPrimaryText: {
    color: "#001c21",
    fontSize: 16,
    fontWeight: "800",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(190,225,227,0.4)",
  },
  orText: {
    color: "rgba(221,232,236,0.82)",
    fontSize: 16,
    fontWeight: "700",
    marginHorizontal: 14,
  },
  btnOutline: {
    minHeight: 62,
    borderRadius: 20,
    borderWidth: 1.4,
    borderColor: "#1de3ae",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 8,
  },
  btnOutlineText: {
    color: "#1de3ae",
    fontSize: 16,
    fontWeight: "700",
  },
});
