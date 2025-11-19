import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./app/navigation/RootNavigator";
// Importujemy nasz nowy Provider
import { AlertProvider } from "./app/context/AlertContext";

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Owijamy wszystko w AlertProvider */}
      <AlertProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AlertProvider>
    </SafeAreaProvider>
  );
}
