import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, collection, addDoc, Timestamp } from "firebase/firestore";
// 1. IMPORTUJEMY NOWY KOMPONENT KALENDARZA/ZEGARA
import DateTimePickerModal from "react-native-modal-datetime-picker";

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

  // === NOWA LOGIKA DLA DATY I GODZINY ===
  // Zamiast stringów, przechowujemy teraz pełne obiekty Date
  const [visitDate, setVisitDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);

  // Stany do pokazywania/ukrywania okienek wyboru
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isStartTimePickerVisible, setStartTimePickerVisibility] =
    useState(false);
  const [isEndTimePickerVisible, setEndTimePickerVisibility] = useState(false);

  // === Logika dla zadań (bez zmian) ===
  const [tasks, setTasks] = useState<string[]>([]); // Tablica z listą zadań
  const [currentTask, setCurrentTask] = useState(""); // Tekst w polu do dodawania zadań

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

  // Funkcja dodająca zadanie z pola tekstowego do naszej listy
  const handleAddTask = () => {
    if (currentTask.trim() === "") return; // Nie dodawaj pustych zadań
    setTasks([...tasks, currentTask.trim()]); // Dodaj zadanie do tablicy
    setCurrentTask(""); // Wyczyść pole tekstowe
  };

  // === NOWE FUNKCJE OBSŁUGI KALENDARZA I ZEGARA ===
  const handleConfirmDate = (date: Date) => {
    setVisitDate(date); // Zapisz wybraną datę
    setDatePickerVisibility(false); // Ukryj kalendarz
  };

  const handleConfirmStartTime = (time: Date) => {
    setStartTime(time); // Zapisz czas rozpoczęcia
    setStartTimePickerVisibility(false); // Ukryj zegar
  };

  const handleConfirmEndTime = (time: Date) => {
    setEndTime(time); // Zapisz czas zakończenia
    setEndTimePickerVisibility(false); // Ukryj zegar
  };

  // Główna funkcja zapisu wizyty (teraz używa obiektów Date)
  const handleScheduleVisit = async () => {
    if (!selectedCaregiver || !visitDate || !startTime || !endTime) {
      Alert.alert(
        "Błąd",
        "Wybierz opiekuna, datę oraz godziny rozpoczęcia i zakończenia."
      );
      return;
    }

    try {
      // Łączymy datę z kalendarza z godzinami z zegarów
      const startDateTime = new Date(
        visitDate.getFullYear(),
        visitDate.getMonth(),
        visitDate.getDate(),
        startTime.getHours(),
        startTime.getMinutes()
      );
      const endDateTime = new Date(
        visitDate.getFullYear(),
        visitDate.getMonth(),
        visitDate.getDate(),
        endTime.getHours(),
        endTime.getMinutes()
      );

      if (endDateTime <= startDateTime) {
        Alert.alert(
          "Błąd",
          "Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia."
        );
        return;
      }

      const tasksForDb = tasks.map((taskText) => ({
        description: taskText,
        isDone: false,
      }));

      await addDoc(collection(db, "shifts"), {
        patientId: patientId,
        patientName: patientName,
        caregiverId: selectedCaregiver.id,
        ownerId: auth.currentUser?.uid,
        start: Timestamp.fromDate(startDateTime), // Konwertujemy na Timestamp
        end: Timestamp.fromDate(endDateTime), // Konwertujemy na Timestamp
        status: "scheduled",
        tasks: tasksForDb,
      });

      Alert.alert("Sukces", "Wizyta została zaplanowana.");
      navigation.goBack();
    } catch (error) {
      console.error("Błąd planowania wizyty: ", error);
      Alert.alert("Błąd", "Nie udało się zaplanować wizyty.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Sekcja wyboru opiekuna */}
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

      {/* === PRZEBUDOWANA SEKCJA DATY I CZASU === */}
      <Text style={styles.label}>Data wizyty:</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setDatePickerVisibility(true)}
      >
        <Text style={styles.pickerButtonText}>
          {visitDate ? visitDate.toLocaleDateString("pl-PL") : "Wybierz datę"}
        </Text>
      </TouchableOpacity>

      <View style={styles.timeRow}>
        <View style={styles.timeColumn}>
          <Text style={styles.label}>Godzina rozpoczęcia:</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setStartTimePickerVisibility(true)}
          >
            <Text style={styles.pickerButtonText}>
              {startTime
                ? startTime.toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Wybierz czas"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.timeColumn}>
          <Text style={styles.label}>Godzina zakończenia:</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setEndTimePickerVisibility(true)}
          >
            <Text style={styles.pickerButtonText}>
              {endTime
                ? endTime.toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Wybierz czas"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* === DODAJEMY KOMPONENTY MODALNE (są niewidoczne, dopóki ich nie włączymy) === */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisibility(false)}
        locale="pl_PL"
        confirmTextIOS="Potwierdź"
        cancelTextIOS="Anuluj"
        minimumDate={new Date()} // Opcjonalnie: nie można wybierać dat z przeszłości
      />
      <DateTimePickerModal
        isVisible={isStartTimePickerVisible}
        mode="time"
        onConfirm={handleConfirmStartTime}
        onCancel={() => setStartTimePickerVisibility(false)}
        locale="pl_PL"
        confirmTextIOS="Potwierdź"
        cancelTextIOS="Anuluj"
        is24Hour={true}
      />
      <DateTimePickerModal
        isVisible={isEndTimePickerVisible}
        mode="time"
        onConfirm={handleConfirmEndTime}
        onCancel={() => setEndTimePickerVisibility(false)}
        locale="pl_PL"
        confirmTextIOS="Potwierdź"
        cancelTextIOS="Anuluj"
        is24Hour={true}
      />

      {/* Sekcja zadań */}
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

// Style (musimy dodać nowe style dla przycisków wyboru)
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontSize: 16, fontWeight: "bold", marginTop: 15, marginBottom: 5 },
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

  // NOWE STYLE DLA PRZYCISKÓW DATY/CZASU
  pickerButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
    paddingHorizontal: 10,
    height: 40,
    justifyContent: "center",
  },
  pickerButtonText: {
    fontSize: 16,
    color: "#333",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: -5, // Drobna korekta dla dopasowania
    marginRight: -5,
  },
  timeColumn: {
    flex: 1, // Dzieli przestrzeń
    marginHorizontal: 5, // Drobny odstęp między nimi
  },

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
  buttonContainer: { marginTop: 30, marginBottom: 50 },
});

export default ScheduleVisitScreen;
