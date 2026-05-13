import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { ArrowLeft, Menu } from "lucide-react-native";
import styles, { theme } from "../estilo";

type Props = {
  title?: string;
  showMenu?: boolean;
  showBack?: boolean;
  onLeftPress?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
};

export default function Header({
  title,
  showMenu = true,
  showBack = true,
  onLeftPress,
  rightIcon,
  onRightPress,
}: Props) {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  const handleLeftPress = () => {
    if (canGoBack) {
      navigation.goBack();
      return;
    }

    if (showMenu && nav?.openDrawer) {
      nav.openDrawer();
    }
  };

  return (
    <View style={styles.header}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {(showBack || showMenu) && (
          <TouchableOpacity
            onPress={handleLeftPress}
            style={styles.headerBackButton}
            activeOpacity={0.85}
          >
            <ArrowLeft color="#f4f6f5" size={28} strokeWidth={2.4} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {rightIcon && (
          <TouchableOpacity onPress={onRightPress} style={styles.headerRightButton}>
            <Menu color={theme.colors.icon} size={20} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
