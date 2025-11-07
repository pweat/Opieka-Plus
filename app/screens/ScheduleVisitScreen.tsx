import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  ScrollView,
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
  const { patientId, patientName } = route.params;
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [selectedCaregiver, setSelectedCaregiver] = useState<any>(null);
  const [visitDate, setVisitDate] = useState(""); // Format: YYYY-MM-DD
  const [startTime, setStartTime] = useState(""); // Format: HH:MM
  const [endTime, setEndTime] = useState(""); // Format: HH:MM

  // === NOWA LOGIKA DLA ZADAŃ ===
  const [tasks, setTasks] = useState<string[]>([]); // Tablica z listą zadań
  const [currentTask, setCurrentTask] = useState(""); // Tekst w polu do dodawania zadań

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

  // Funkcja dodająca zadanie z pola tekstowego do naszej listy
  const handleAddTask = () => {
    if (currentTask.trim() === "") return; // Nie dodawaj pustych zadań
    setTasks([...tasks, currentTask.trim()]); // Dodaj zadanie do tablicy
    setCurrentTask(""); // Wyczyść pole tekstowe
  };

  const handleScheduleVisit = async () => {
    if (!selectedCaregiver || !visitDate || !startTime || !endTime) {
      Alert.alert("Błąd", "Wypełnij wszystkie pola wizyty.");
      return;
    }

    try {
      const startDateTime = new Date(`${visitDate}T${startTime}:00`);
      const endDateTime = new Date(`${visitDate}T${endTime}:00`);

      // Tworzymy obiekty zadań (zamiast prostych stringów)
      // Dzięki temu Opiekun będzie mógł odhaczyć zadanie (zmienić status)
      const tasksForDb = tasks.map((taskText) => ({
        description: taskText,
        isDone: false,
      }));

      await addDoc(collection(db, "shifts"), {
        patientId: patientId,
        patientName: patientName,
        caregiverId: selectedCaregiver.id,
        ownerId: auth.currentUser?.uid,
        start: Timestamp.fromDate(startDateTime),
        end: Timestamp.fromDate(endDateTime),
        status: "scheduled",
        tasks: tasksForDb, // Zapisujemy naszą nową listę zadań!
      });

      Alert.alert("Sukces", "Wizyta została zaplanowana.");
      navigation.goBack();
    } catch (error) {
      console.error("Błąd planowania wizyty: ", error);
      Alert.alert("Błąd", "Nie udało się zaplanować wizyty.");
    }
  };

  return (
    // Używamy ScrollView, aby ekran można było przewijać, gdy lista zadań będzie długa
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Wybierz opiekuna:</Text>
      <View style={styles.pillsContainer}>
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
      </View>

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

      {/* NOWA SEKCJA DODAWANIA ZADAŃ */}
      <Text style={styles.label}>Zadania do wykonania:</Text>
      <View style={styles.taskInputContainer}>
        <TextInput
          style={styles.taskInput}
          placeholder="np. Podać leki o 10:00"
          value={currentTask}
          onChangeText={setCurrentTask}
        />
        <Button title="Dodaj" onPress={handleAddTask} />
      </View>

      {/* Lista zadań, które już dodaliśmy */}
      {tasks.map((task, index) => (
        <Text key={index} style={styles.taskItem}>
          • {task}
        </Text>
      ))}

      <View style={styles.buttonContainer}>
        <Button title="Zaplanuj wizytę" onPress={handleScheduleVisit} />
      </View>
    </ScrollView>
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
    backgroundColor: "white",
  },
  pillsContainer: { flexDirection: "row", flexWrap: "wrap" },
  caregiverPill: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#007bff",
    margin: 5,
    backgroundColor: "white",
  },
  selectedPill: { backgroundColor: "#007bff" },
  selectedPillText: { color: "white" },
  taskInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  taskInput: {
    flex: 1,
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    backgroundColor: "white",
  },
  taskItem: { fontSize: 16, marginLeft: 10, marginBottom: 5 },
  buttonContainer: { marginTop: 30, marginBottom: 50 }, // Dodany margines na dole
});

export default ScheduleVisitScreen;
