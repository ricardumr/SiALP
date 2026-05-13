import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  TextInput,
  Platform,
  SafeAreaView,
} from "react-native";
import { useState } from "react";
import { auth } from "../firebase";
import { useNavigation } from "@react-navigation/native";
import { ClipboardCheck, Mail, Lock, Eye, Shield } from "lucide-react-native";

export default function Login() {
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const logar = () => {
    auth
      .signInWithEmailAndPassword(email, senha)
      .then((userCredentials) => {
        navigation.replace("Menu");
      })
      .catch((erro) => alert(erro.message));
  };

  const loginColors = {
    background: "#052e36",
    card: "#0b3439",
    accent: "#3ef7ad",
    text: "#f6fbff",
    border: "rgba(255,255,255,0.16)",
    placeholder: "rgba(255,255,255,0.72)",
  };

  return (
    <SafeAreaView style={[localStyles.screen, { backgroundColor: loginColors.background }]}> 
      <StatusBar style="light" backgroundColor={loginColors.background} />
      <View style={localStyles.backgroundLayer}>
        <View style={localStyles.backgroundCircle1} />
        <View style={localStyles.backgroundCircle2} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={localStyles.flex}
      >
        <View style={localStyles.content}>
          <View style={localStyles.brandBox}>
            <Text style={localStyles.brandTitle}>SiALP</Text>
            <Text style={localStyles.brandSubtitle}>
              Sistema Automatizado de Levantamento Patrimonial
            </Text>
          </View>

          <View style={[localStyles.card, { backgroundColor: loginColors.card }]}>
            <View style={localStyles.cardIconWrapper}>
              <View style={localStyles.cardIcon}> 
                <ClipboardCheck color={loginColors.accent} size={30} />
              </View>
            </View>

            <Text style={localStyles.cardTitle}>Login</Text>

            <View style={localStyles.field}>
              <View style={localStyles.fieldIconBox}>
                <Mail color={loginColors.accent} size={18} />
              </View>
              <TextInput
                placeholder="Email"
                placeholderTextColor={loginColors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[localStyles.input, { color: loginColors.text }]}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={localStyles.field}>
              <View style={localStyles.fieldIconBox}>
                <Lock color={loginColors.accent} size={18} />
              </View>
              <TextInput
                placeholder="Senha"
                placeholderTextColor={loginColors.placeholder}
                secureTextEntry
                style={[localStyles.input, { color: loginColors.text }]}
                value={senha}
                onChangeText={setSenha}
              />
              <TouchableOpacity style={localStyles.eyeButton} activeOpacity={0.7}>
                <Eye color={loginColors.text} size={18} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[localStyles.primaryButton, { backgroundColor: loginColors.accent }]}
              onPress={logar}
            >
              <Text style={localStyles.primaryButtonText}>Acessar</Text>
            </TouchableOpacity>
          </View>

          <View style={localStyles.footer}>
            <Shield color={loginColors.accent} size={16} />
            <Text style={localStyles.footerText}>Acesso seguro e protegido</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 24,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 96,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  backgroundCircle1: {
    position: "absolute",
    top: -40,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(62, 247, 173, 0.12)",
  },
  backgroundCircle2: {
    position: "absolute",
    bottom: -80,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  brandBox: {
    marginTop: 108,
    alignItems: "center",
    gap: 8,
  },
  brandTitle: {
    fontSize: 62,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 4,
  },
  brandSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.84)",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 340,
  },
  card: {
    width: "100%",
    maxWidth: 540,
    minHeight: 560,
    borderRadius: 26,
    padding: 40,
    paddingTop: 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 38,
    elevation: 14,
    alignItems: "center",
    marginTop: -28,
    marginBottom: 30,
  },
  cardIconWrapper: {
    marginTop: -58,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIcon: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  cardTitle: {
    fontSize: 34,
    color: "#fff",
    fontWeight: "800",
    marginBottom: 24,
  },
  field: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    minHeight: 60,
  },
  fieldIconBox: {
    width: 38,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 58,
    fontSize: 16,
    color: "#fff",
  },
  eyeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    width: "100%",
    marginTop: 10,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#052e36",
    fontSize: 18,
    fontWeight: "900",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 34,
  },
  footerText: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 14,
  },
});
