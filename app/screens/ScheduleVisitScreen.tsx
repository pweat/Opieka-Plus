import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, collection, addDoc, Timestamp } from "firebase/firestore";

const ScheduleVisitScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { patientId } = route.params;
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [selectedCaregiver, setSelectedCaregiver] = useState<any>(null);
  const [visitDate, setVisitDate] = useState(""); // Format: YYYY-MM-DD
  const [startTime, setStartTime] = useState(""); // Format: HH:MM
  const [endTime, setEndTime] = useState(""); // Format: HH:MM

  // Pobieramy listę opiekunów przypisanych do tego pacjenta
  useEffect(() => {
    const fetchCaregivers = async () => {
      const patientDocRef = doc(db, "patients", patientId);
      const patientDoc = await getDoc(patientDocRef);
      if (patientDoc.exists() && patientDoc.data().caregiverIds) {
        const caregiverIds = patientDoc.data().caregiverIds;
        const caregiversData = await Promise.all(
          caregiverIds.map(async (id: string) => {
            const userDoc = await getDoc(doc(db, "users", id));
            return userDoc.exists()
              ? { id: userDoc.id, ...userDoc.data() }
              : null;
          })
        );
        setCaregivers(caregiversData.filter((c) => c !== null));
      }
    };
    fetchCaregivers();
  }, [patientId]);

  const handleScheduleVisit = async () => {
    if (!selectedCaregiver || !visitDate || !startTime || !endTime) {
      Alert.alert("Błąd", "Wypełnij wszystkie pola.");
      return;
    }

    try {
      // Tworzymy obiekty daty na podstawie wpisanych stringów
      const startDateTime = new Date(`${visitDate}T${startTime}:00`);
      const endDateTime = new Date(`${visitDate}T${endTime}:00`);

      await addDoc(collection(db, "shifts"), {
        patientId: patientId,
        caregiverId: selectedCaregiver.id,
        ownerId: auth.currentUser?.uid,
        start: Timestamp.fromDate(startDateTime),
        end: Timestamp.fromDate(endDateTime),
        status: "scheduled", // Status nowej wizyty
        tasks: [], // Pusta tablica na przyszłe zadania
      });

      Alert.alert("Sukces", "Wizyta została zaplanowana.");
      navigation.goBack();
    } catch (error) {
      console.error("Błąd planowania wizyty: ", error);
      Alert.alert("Błąd", "Nie udało się zaplanować wizyty.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Wybierz opiekuna:</Text>
      {caregivers.map((cg) => (
        <TouchableOpacity
          key={cg.id}
          style={[
            styles.caregiverPill,
            selectedCaregiver?.id === cg.id && styles.selectedPill,
          ]}
          onPress={() => setSelectedCaregiver(cg)}
        >
          <Text
            style={selectedCaregiver?.id === cg.id && styles.selectedPillText}
          >
            {cg.email}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.label}>Data wizyty:</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={visitDate}
        onChangeText={setVisitDate}
      />

      <Text style={styles.label}>Godzina rozpoczęcia:</Text>
      <TextInput
        style={styles.input}
        placeholder="HH:MM"
        value={startTime}
        onChangeText={setStartTime}
      />

      <Text style={styles.label}>Godzina zakończenia:</Text>
      <TextInput
        style={styles.input}
        placeholder="HH:MM"
        value={endTime}
        onChangeText={setEndTime}
      />
      <View style={styles.buttonContainer}>
        <Button title="Zaplanuj wizytę" onPress={handleScheduleVisit} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontSize: 16, fontWeight: "bold", marginTop: 15, marginBottom: 5 },
  input: {
    width: "100%",
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  caregiverPill: {
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "blue",
    margin: 5,
  },
  selectedPill: { backgroundColor: "blue" },
  selectedPillText: { color: "white" },
  buttonContainer: {
    width: "100%",
    marginTop: 10,
  },
});

export default ScheduleVisitScreen;
