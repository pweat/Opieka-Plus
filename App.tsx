import React from "react";
// Importujemy elementy potrzebne do nawigacji
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Importujemy nasze ekrany
import WelcomeScreen from "./app/screens/WelcomeScreen";
import LoginScreen from "./app/screens/LoginScreen";
import RegisterScreen from "./app/screens/RegisterScreen";

// Tworzymy "stertę" (stack) nawigacji
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    // NavigationContainer to główny pojemnik, który musi objąć całą nawigację
    <NavigationContainer>
      {/* Stack.Navigator zarządza naszymi ekranami */}
      <Stack.Navigator
        initialRouteName="Welcome" // Ustalamy, który ekran jest pierwszy
        screenOptions={{ headerShown: false }} // Ukrywamy domyślny nagłówek na górze
      >
        {/* Definiujemy dostępne ekrany */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
