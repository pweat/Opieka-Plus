import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Panel Główny" }}
      />
      {/* W przyszłości dodamy tu inne ekrany, np. "Profil Podopiecznego" */}
    </Stack.Navigator>
  );
};

export default AppNavigator;
