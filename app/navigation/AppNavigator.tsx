import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Ekrany aplikacji właściwej
import HomeScreen from "../screens/HomeScreen";
import AddPatientScreen from "../screens/AddPatientScreen";
import PatientDetailScreen from "../screens/PatientDetailScreen";
import EditPatientScreen from "../screens/EditPatientScreen";
import ManageCaregiversScreen from "../screens/ManageCaregiversScreen";
import ScheduleVisitScreen from "../screens/ScheduleVisitScreen";
import ShiftDetailScreen from "../screens/ShiftDetailScreen";
import ReportDetailScreen from "../screens/ReportDetailScreen";
import EditVisitScreen from "../screens/EditVisitScreen";

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
        name="AddPatient"
        component={AddPatientScreen}
        options={{ title: "Dodaj podopiecznego" }}
      />
      <Stack.Screen
        name="PatientDetail"
        component={PatientDetailScreen}
        options={{ title: "Profil Podopiecznego" }}
      />
      <Stack.Screen
        name="EditPatient"
        component={EditPatientScreen}
        options={{ title: "Edytuj Profil" }}
      />
      <Stack.Screen
        name="ManageCaregivers"
        component={ManageCaregiversScreen}
        options={{ title: "Zarządzaj Opiekunami" }}
      />
      <Stack.Screen
        name="ScheduleVisit"
        component={ScheduleVisitScreen}
        options={{ title: "Zaplanuj Wizytę" }}
      />
      <Stack.Screen
        name="ShiftDetail"
        component={ShiftDetailScreen}
        options={{ title: "Dziennik Wizyty" }}
      />
      <Stack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{ title: "Raport z Wizyty" }}
      />
      <Stack.Screen
        name="EditVisit"
        component={EditVisitScreen}
        options={{ title: "Edytuj wizytę" }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
