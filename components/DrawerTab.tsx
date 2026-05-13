import React, { useState, useEffect } from "react";
import { TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles from "../estilo";

export default function DrawerTab() {
  const navigation = useNavigation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("drawerOpen", () => {
      setIsOpen(true);
    });

    const unsubscribeClose = navigation.addListener("drawerClose", () => {
      setIsOpen(false);
    });

    return () => {
      unsubscribe();
      unsubscribeClose();
    };
  }, [navigation]);

  const handlePress = () => {
    if (isOpen) {
      (navigation as any).closeDrawer?.();
    } else {
      (navigation as any).openDrawer?.();
    }
  };

  return (
    <TouchableOpacity
      style={styles.drawerTab}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={styles.drawerTabText}>{isOpen ? "‹" : "›"}</Text>
    </TouchableOpacity>
  );
}
