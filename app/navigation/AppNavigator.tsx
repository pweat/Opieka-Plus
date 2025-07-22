import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import AddPatientScreen from "../screens/AddPatientScreen";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      {/* 2. Dodaj nowy ekran. Ustawiamy tytuł, który pokaże się na górze. */}
      <Stack.Screen
        name="AddPatient"
        component={AddPatientScreen}
        options={{ title: "Dodaj podopiecznego" }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
