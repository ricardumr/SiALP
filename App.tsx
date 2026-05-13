import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import Menu from './screens/Menu';
import Login from './screens/Login';
import Cadastro_usuario from './screens/Cadastro_usuario';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import styles from './estilo';

const Stack=createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name='Login' component={Login} options={{headerShown:false}}/>
        <Stack.Screen name='Menu' component={Menu} options={{headerShown:false}}/>
        <Stack.Screen name='Cadastro usuário' component={Cadastro_usuario} options={{headerShown:false}}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

