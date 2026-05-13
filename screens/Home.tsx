import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  Button,
  TouchableOpacity,
  Image,
  ImageBackground,
} from "react-native";
import { auth, firestore } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import styles, { theme } from "../estilo";
import { TextInput } from "react-native-paper";
import Header from "../components/Header";
import {
  Archive,
  Boxes,
  ClipboardCheck,
  DoorOpen,
  MapPin,
  PlusSquare,
  ShieldPlus,
  UserPlus,
} from "lucide-react-native";
import { getCurrentUserContext } from "../model/userContext";

export default function Home() {
  const navigation = useNavigation();
  const [adm, setAdm] = useState<boolean>(false);

  const sair = () => {
    auth.signOut().then(() => {
      navigation.replace("Login");
    });
  };

  // load current user record to detect admin status
  React.useEffect(() => {
    getCurrentUserContext().then((context) => {
      if (context) setAdm(context.adm);
    });
  }, []);

  let menuItems: Array<{
    label: string;
    screen: string;
    icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  }> = [];

  if (adm) {
    menuItems = [
      { label: "Listar Itens", screen: "Lista itens", icon: Archive },
      { label: "Listar Salas", screen: "Lista salas", icon: DoorOpen },
      { label: "Cadastrar Item", screen: "Cadastrar item", icon: PlusSquare },
      { label: "Cadastrar Sala", screen: "Cadastrar sala", icon: Boxes },
      { label: "Conferência", screen: "Conferencia de inventário", icon: ClipboardCheck },
      { label: "Histórico de Conferências", screen: "Lista de conferências", icon: ShieldPlus },
      { label: "Cadastrar Usuário", screen: "Cadastrar usuário", icon: UserPlus },
    ];
  } else {
    menuItems = [
      { label: "Conferência", screen: "Conferencia de inventário", icon: ClipboardCheck },
    ];
  }

  return (
    <View
  style={[styles.container, { backgroundColor: theme.colors.background }]}
      
    >
      <View
        style={{ marginTop: 120, flex: 1, width: "100%", alignItems: "center" }}
      >
        <Header title="Página Inicial" />
        <View>
          <View style={styles.logo}></View>
          <Text style={{ color: theme.colors.text, marginTop: 8, fontWeight: "600" }}>
            Bem vindo! {auth.currentUser?.email}
          </Text>
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuCard}
              onPress={() => navigation.navigate(item.screen)}
            >
              <item.icon
                size={28}
                color={theme.colors.accent}
                strokeWidth={2.2}
              />
              <Text style={styles.menuCardText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.botaoLog, { marginBottom: 100 }]}
          onPress={sair}
        >
          <Text style={[styles.primaryButtonText, { color: "#000000" }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
