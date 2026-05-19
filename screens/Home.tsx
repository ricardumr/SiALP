import React from "react";
import { StatusBar } from "expo-status-bar";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { auth } from "../firebase";
import {
  Archive,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  DoorOpen,
  LogOut,
  PlusSquare,
  ShieldPlus,
  UserPlus,
} from "lucide-react-native";
import { getCurrentUserContext } from "../model/userContext";

type MenuItem = {
  label: string;
  screen: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

export default function Home() {
  const navigation = useNavigation<any>();
  const [adm, setAdm] = React.useState(false);

  React.useEffect(() => {
    getCurrentUserContext().then((context) => {
      if (context) setAdm(!!context.adm);
    });
  }, []);

  const sair = () => {
    auth.signOut().then(() => {
      navigation.replace("Login");
    });
  };

  const menuItems: MenuItem[] = adm
    ? [
        { label: "Listar Itens", screen: "Lista itens", icon: Archive },
        { label: "Listar Salas", screen: "Lista salas", icon: DoorOpen },
        { label: "Cadastrar Item", screen: "Cadastrar item", icon: PlusSquare },
        { label: "Cadastrar Sala", screen: "Cadastrar sala", icon: Boxes },
        { label: "Conferência", screen: "Conferencia de inventário", icon: ClipboardCheck },
        {
          label: "Histórico de Conferências",
          screen: "Lista de conferências",
          icon: ShieldPlus,
        },
        { label: "Cadastrar Usuário", screen: "Cadastrar usuário", icon: UserPlus },
      ]
    : [{ label: "Conferência", screen: "Conferencia de inventário", icon: ClipboardCheck }];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.bgLayer}>
        <View style={styles.glowTopLeft} />
        <View style={styles.glowBottomRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              navigation.dispatch(DrawerActions.openDrawer());
            }}
          >
            <ChevronLeft color="#e9f2f4" size={30} />
          </TouchableOpacity>
          <Text style={styles.title}>Página Inicial</Text>
        </View>

        <Text style={styles.welcome}>Bem-vindo de volta,</Text>
        <Text style={styles.email}>{auth.currentUser?.email ?? "usuário"}</Text>

        <View style={styles.grid}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={`${item.screen}-${index}`}
                style={[styles.card, index === menuItems.length - 1 && menuItems.length % 2 !== 0 ? styles.cardSingle : null]}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.9}
              >
                <View style={styles.iconCircle}>
                  <Icon size={34} color="#159a7e" strokeWidth={2.1} />
                </View>
                <Text style={styles.cardText} numberOfLines={2}>
                  {item.label}
                </Text>
                <ChevronRight color="#159a7e" size={30} />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={sair} activeOpacity={0.92}>
          <LogOut color="#032c35" size={30} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#053a45",
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#053a45",
  },
  glowTopLeft: {
    position: "absolute",
    top: -120,
    left: -160,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "rgba(22,162,151,0.25)",
    borderWidth: 1,
    borderColor: "rgba(141,220,214,0.25)",
  },
  glowBottomRight: {
    position: "absolute",
    right: -130,
    bottom: -130,
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: "rgba(23,145,163,0.2)",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(9,94,98,0.45)",
    borderWidth: 1,
    borderColor: "rgba(117,203,199,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: {
    color: "#edf4f5",
    fontSize: 34,
    fontWeight: "800",
  },
  welcome: {
    color: "rgba(224,237,239,0.88)",
    textAlign: "center",
    fontSize: 14,
    marginTop: 2,
  },
  email: {
    color: "#20efbe",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48.5%",
    minHeight: 122,
    borderRadius: 16,
    backgroundColor: "#edf1f2",
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    shadowColor: "#02161a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  cardSingle: {
    width: "48.5%",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#d8e8e4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  cardText: {
    color: "#0f2834",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  logoutBtn: {
    marginTop: 6,
    width: "100%",
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#1ce8b1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#00f2ba",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  logoutText: {
    color: "#032c35",
    fontSize: 15,
    fontWeight: "800",
  },
});
