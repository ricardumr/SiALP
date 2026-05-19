import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { auth, firestore } from "../firebase";
import {
  ClipboardCheck,
  DoorOpen,
  House,
  List,
  ListChecks,
  PackagePlus,
  UserPlus,
  Warehouse,
} from "lucide-react-native";

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
        drawerStyle: {
          backgroundColor: theme.colors.drawer,
          width: "84%",
          borderTopRightRadius: 28,
          borderBottomRightRadius: 28,
        },
        drawerActiveTintColor: theme.colors.accent,
        drawerInactiveTintColor: "#d8e3e1",
        drawerLabelStyle: { fontSize: 17, fontWeight: "500", marginLeft: -8 },
        drawerItemStyle: { borderRadius: 14, marginHorizontal: 8 },
        drawerActiveBackgroundColor: "rgba(40,167,146,0.18)",
      }}
      drawerContent={(props) => <CustomDrawer {...props} />}
    >
      <Drawer.Screen
        name="Página Inicial"
        component={Home}
        options={{
          drawerIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      {adm ? (
        <>
          <Drawer.Screen
            name="Conferencia de inventário"
            component={Conferencia_salas}
            options={{
              drawerIcon: ({ color, size }) => <ClipboardCheck color={color} size={size} />,
            }}
          />
          <Drawer.Screen
            name="Conferencia sala"
            component={Conferencia_inventario}
            options={{ drawerItemStyle: { display: "none" } }}
          />
          <Drawer.Screen
            name="Cadastrar item"
            component={Cadastro_item}
            options={{
              drawerIcon: ({ color, size }) => <PackagePlus color={color} size={size} />,
            }}
          />
          <Drawer.Screen
            name="Cadastrar sala"
            component={Cadastro_sala}
            options={{
              drawerIcon: ({ color, size }) => <DoorOpen color={color} size={size} />,
            }}
          />
          <Drawer.Screen
            name="Cadastrar usuário"
            component={Cadastro_usuario}
            options={{
              drawerIcon: ({ color, size }) => <UserPlus color={color} size={size} />,
            }}
          />
          <Drawer.Screen
            name="Lista itens"
            component={Listar_itens}
            options={{
              drawerIcon: ({ color, size }) => <List color={color} size={size} />,
            }}
          />
          <Drawer.Screen
            name="Lista salas"
            component={Listar_salas}
            options={{
              drawerIcon: ({ color, size }) => <Warehouse color={color} size={size} />,
            }}
          />
          <Drawer.Screen
            name="Lista de conferências"
            component={Lista_conferencias}
            options={{
              drawerIcon: ({ color, size }) => <ListChecks color={color} size={size} />,
            }}
          />
        </>
      ) : (
        <>
          <Drawer.Screen
            name="Conferencia de inventário"
            component={Conferencia_salas}
            options={{
              drawerIcon: ({ color, size }) => <ClipboardCheck color={color} size={size} />,
            }}
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
