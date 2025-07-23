import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import AddPatientScreen from "../screens/AddPatientScreen";
import PatientDetailScreen from "../screens/PatientDetailScreen";
import ManageCaregiversScreen from "../screens/ManageCaregiversScreen";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PatientDetail"
        component={PatientDetailScreen}
        options={{ title: "Profil Podopiecznego" }}
      />
      <Stack.Screen
        name="ManageCaregivers"
        component={ManageCaregiversScreen}
        options={{ title: "Zarządzaj Opiekunami" }}
      />
      <Stack.Screen
        name="AddPatient"
        component={AddPatientScreen}
        options={{ title: "Dodaj podopiecznego" }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
