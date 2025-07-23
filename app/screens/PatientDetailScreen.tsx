import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const PatientDetailScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { patientId } = route.params; // Odbieramy ID podopiecznego przekazane z poprzedniego ekranu
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);

  useEffect(() => {
    const fetchPatient = async () => {
      const docRef = doc(db, "patients", patientId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPatient({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.log("Nie znaleziono takiego podopiecznego!");
      }
      setLoading(false);
    };
    fetchPatient();
  }, [patientId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.container}>
        <Text>Nie znaleziono podopiecznego.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{patient.name}</Text>
      <Text style={styles.description}>{patient.description}</Text>
      {/* Ten przycisk przeniesie nas do ekranu zarządzania opiekunami */}
      <Button
        title="Zarządzaj Opiekunami"
        onPress={() =>
          navigation.navigate("ManageCaregivers", { patientId: patient.id })
        }
      />
      <View style={styles.buttonRow}>
        <Button
          title="Zaplanuj Wizytę"
          onPress={() =>
            navigation.navigate("ScheduleVisit", { patientId: patient.id })
          }
        />
        <Button
          title="Zarządzaj Opiekunami"
          onPress={() =>
            navigation.navigate("ManageCaregivers", { patientId: patient.id })
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  name: { fontSize: 28, fontWeight: "bold", marginBottom: 10 },
  description: { fontSize: 16, color: "gray", marginBottom: 30 },
  buttonRow: {
    flexDirection: "row", // Ustawia elementy w rzędzie, a nie w kolumnie
    justifyContent: "space-around", // Rozkłada elementy równomiernie wzdłuż osi
    width: "100%", // Kontener ma zająć całą szerokość
    marginTop: 30, // Dodaje margines od góry, by oddzielić od opisu
  },
});

export default PatientDetailScreen;
