import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../firebase";
import { Search, User, LogOut } from "lucide-react-native";
import { TextInput } from "react-native-paper";
import { theme } from "../estilo";

export default function CustomDrawer(props: any) {
  const email = auth.currentUser?.email ?? "Usuário";
  const [query, setQuery] = React.useState("");
  const currentRouteName = props.state?.routeNames?.[props.state?.index] ?? "";

  const routes = (props.state?.routes ?? []).filter((route: any) => {
    const options = props.descriptors?.[route.key]?.options ?? {};
    const hidden = options?.drawerItemStyle?.display === "none";
    if (hidden) return false;
    const label = String(options.drawerLabel ?? route.name).toLowerCase();
    return label.includes(query.trim().toLowerCase());
  });

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      props.navigation.replace("Login");
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.avatarCircle}>
            <User color="#20e9b8" size={34} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>inventário</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            mode="flat"
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar menu"
            placeholderTextColor="rgba(220,232,234,0.85)"
            style={styles.searchInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            textColor="#e8f2f4"
            left={<TextInput.Icon icon={() => <Search color="#20e9b8" size={24} />} />}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.menuList}>
          {routes.map((route: any) => {
            const options = props.descriptors?.[route.key]?.options ?? {};
            const isActive = currentRouteName === route.name;
            const label = String(options.drawerLabel ?? route.name);

            const iconRenderer = options.drawerIcon;
            const iconNode =
              typeof iconRenderer === "function"
                ? iconRenderer({
                    focused: isActive,
                    color: isActive ? theme.colors.accent : "#22f0be",
                    size: 27,
                  })
                : null;

            return (
              <TouchableOpacity
                key={route.key}
                activeOpacity={0.86}
                onPress={() => props.navigation.navigate(route.name)}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
              >
                <View style={styles.iconWrap}>{iconNode}</View>
                <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </DrawerContentScrollView>

      <View style={styles.bottomWrap}>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.9}>
          <LogOut color="#ff7373" size={28} />
          <Text style={styles.signOutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.drawer,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 6,
    paddingVertical: 10,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: "rgba(100,225,209,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6,90,93,0.25)",
  },
  title: {
    color: "#edf4f5",
    fontSize: 22,
    fontWeight: "700",
  },
  email: {
    color: "rgba(211,226,229,0.9)",
    fontSize: 13,
    marginTop: 2,
  },
  searchWrap: {
    borderWidth: 1,
    borderColor: "rgba(152,218,221,0.25)",
    borderRadius: 18,
    backgroundColor: "rgba(10,86,92,0.18)",
    marginHorizontal: 2,
    marginTop: 6,
    marginBottom: 12,
    overflow: "hidden",
  },
  searchInput: {
    backgroundColor: "transparent",
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(148,213,216,0.22)",
    marginBottom: 8,
  },
  menuList: {
    paddingTop: 6,
  },
  menuItem: {
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,213,216,0.16)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 2,
  },
  menuItemActive: {
    backgroundColor: "rgba(31,185,159,0.18)",
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  menuLabel: {
    color: "#e6f1f3",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  menuLabelActive: {
    color: "#24efbf",
    fontWeight: "700",
  },
  bottomWrap: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148,213,216,0.25)",
    padding: 12,
    paddingBottom: 16,
  },
  signOutBtn: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ff6666",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 18,
    gap: 12,
    backgroundColor: "rgba(145,27,27,0.05)",
  },
  signOutText: {
    color: "#ff7373",
    fontSize: 18,
    fontWeight: "700",
  },
});
