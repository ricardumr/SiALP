import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { auth, firestore } from "../firebase";

import Home from "./Home";
import Cadastro_item from "./Cadastro_item";
import Cadastro_sala from "./Cadastro_sala";
import Listar_itens from "./Listar_itens";
import Listar_salas from "./Listar_salas";
import Listar_local from "./Listar_local";
import { Conferencia } from "../model/Conferencia";
import Conferencia_inventario from "./Conferencia_inventario";
import Conferencia_salas from "./Conferencia_salas";
import Lista_conferencias from "./Listar_conferencias";
import Cadastro_usuario from "./Cadastro_usuario";
import CustomDrawer from "../components/CustomDrawer";
import { theme } from "../estilo";
import { getCurrentUserContext } from "../model/userContext";

const Drawer = createDrawerNavigator();

export default function Menu() {
  const [adm, setAdm] = React.useState<boolean>(false);

  React.useEffect(() => {
    getCurrentUserContext().then((context) => {
      if (context) setAdm(context.adm);
    });
  }, []);

  return (
    <Drawer.Navigator
      initialRouteName="Página Inicial"
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: theme.colors.drawer },
        drawerActiveTintColor: theme.colors.accent,
        drawerInactiveTintColor: theme.colors.textMuted,
        drawerLabelStyle: { fontSize: 14, fontWeight: "500" },
        drawerItemStyle: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
      }}
      drawerContent={(props) => <CustomDrawer {...props} />}
    >
      <Drawer.Screen name="Página Inicial" component={Home} />
      {adm ? (
        <>
          <Drawer.Screen name="Conferencia de inventário" component={Conferencia_salas}/>
          <Drawer.Screen
            name="Conferencia sala"
            component={Conferencia_inventario}
            options={{ drawerItemStyle: { display: "none" } }}
          />
          <Drawer.Screen name="Cadastrar item" component={Cadastro_item} />
          <Drawer.Screen name="Cadastrar sala" component={Cadastro_sala} />
          <Drawer.Screen name="Cadastrar usuário" component={Cadastro_usuario}/>
          <Drawer.Screen name="Lista itens" component={Listar_itens} />
          <Drawer.Screen name="Lista salas" component={Listar_salas} />
          <Drawer.Screen name="Lista de conferências" component={Lista_conferencias}/>
        </>
      ) : (
        <>
          <Drawer.Screen
            name="Conferencia de inventário"
            component={Conferencia_salas}
          />
          <Drawer.Screen
            name="Conferencia sala"
            component={Conferencia_inventario}
            options={{ drawerItemStyle: { display: "none" } }}
          />
        </>
      )}
    </Drawer.Navigator>
  );
}
