import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { TextInput } from "react-native-paper";
import { auth } from "../firebase";
import { theme } from "../estilo";

export default function CustomDrawer(props: any) {
  const email = auth.currentUser?.email;

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      props.navigation.replace("Login");
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{
        paddingTop: 16,
        flex: 1,
        backgroundColor: theme.colors.drawer,
      }}
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <Text style={{ fontSize: 28, color: theme.colors.text, fontWeight: "300" }}>
          inventário
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
          {email ?? "Usuário"}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <TextInput
          mode="flat"
          placeholder="Buscar menu"
          placeholderTextColor="#fff"
          style={{ backgroundColor: "transparent" }}
          underlineColor={theme.colors.border}
          activeUnderlineColor={theme.colors.accent}
          textColor={theme.colors.text}
          left={<TextInput.Icon icon="magnify" color={theme.colors.textMuted} />}
        />
      </View>

      <View style={{ flex: 1, paddingTop: 4 }}>
        <DrawerItemList {...props} />
      </View>

      <View
        style={{
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: "#7f1d1d",
            backgroundColor: "transparent",
          }}
        >
          <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>Sair</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}
