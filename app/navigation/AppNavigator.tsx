import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Import wszystkich ekranów
import HomeScreen from "../screens/HomeScreen";
import AddPatientScreen from "../screens/AddPatientScreen";
import PatientDetailScreen from "../screens/PatientDetailScreen";
import EditPatientScreen from "../screens/EditPatientScreen";
import ManageCaregiversScreen from "../screens/ManageCaregiversScreen";
import ScheduleVisitScreen from "../screens/ScheduleVisitScreen";
import ShiftDetailScreen from "../screens/ShiftDetailScreen";
import ReportDetailScreen from "../screens/ReportDetailScreen";
import MedicalHistoryScreen from "../screens/MedicalHistoryScreen";
import EditVisitScreen from "../screens/EditVisitScreen";

// Definiujemy typy parametrów dla każdego ekranu (Dobra praktyka)
export type RootStackParamList = {
  Home: undefined;
  AddPatient: undefined;
  PatientDetail: { patientId: string; patientName: string };
  EditPatient: { patientId: string };
  ManageCaregivers: { patientId: string };
  ScheduleVisit: { patientId: string; patientName: string };
  ShiftDetail: { shiftId: string };
  ReportDetail: { shiftId: string };
  MedicalHistory: { patientId: string };
  EditVisit: { shiftId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    // @ts-ignore - Ignorujemy błąd 'id is missing', to problem typów w v7
    <Stack.Navigator screenOptions={{ headerBackTitleVisible: false }}>
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
        name="MedicalHistory"
        component={MedicalHistoryScreen}
        options={{ title: "Kartoteka Medyczna" }}
      />
      <Stack.Screen
        name="EditVisit"
        component={EditVisitScreen}
        options={{ title: "Edytuj Wizytę" }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
