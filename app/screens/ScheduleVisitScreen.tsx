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
import { theme } from "../../theme";
import { doc, getDoc, collection, addDoc, Timestamp } from "firebase/firestore";
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

  // Stany dla daty i godziny (bez zmian)
  const [visitDate, setVisitDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isStartTimePickerVisible, setStartTimePickerVisibility] =
    useState(false);
  const [isEndTimePickerVisible, setEndTimePickerVisibility] = useState(false);

  // Stany dla zadań (bez zmian)
  const [tasks, setTasks] = useState<string[]>([]);
  const [currentTask, setCurrentTask] = useState("");

  // Pobieranie opiekunów (TERAZ POBIERA PEŁEN PROFIL)
  useEffect(() => {
    const fetchCaregivers = async () => {
      const patientDocRef = doc(db, "patients", patientId);
      const patientDoc = await getDoc(patientDocRef);
      if (patientDoc.exists() && patientDoc.data().caregiverIds) {
        const caregiverIds = patientDoc.data().caregiverIds;
        // Pobieramy pełne dane użytkownika (w tym 'name' i 'email')
        const caregiversData = await Promise.all(
          caregiverIds.map(async (id: string) => {
            const userDoc = await getDoc(doc(db, "users", id));
            // Zwracamy cały dokument użytkownika
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

  // Funkcje obsługi (bez zmian)
  const handleAddTask = () => {
    if (currentTask.trim() === "") return;
    setTasks([...tasks, currentTask.trim()]);
    setCurrentTask("");
  };
  const handleConfirmDate = (date: Date) => {
    setVisitDate(date);
    setDatePickerVisibility(false);
  };
  const handleConfirmStartTime = (time: Date) => {
    setStartTime(time);
    setStartTimePickerVisibility(false);
  };
  const handleConfirmEndTime = (time: Date) => {
    setEndTime(time);
    setEndTimePickerVisibility(false);
  };
  const handleScheduleVisit = async () => {
    if (!selectedCaregiver || !visitDate || !startTime || !endTime) {
      Alert.alert(
        "Błąd",
        "Wybierz opiekuna, datę oraz godziny rozpoczęcia i zakończenia."
      );
      return;
    }
    try {
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
        start: Timestamp.fromDate(startDateTime),
        end: Timestamp.fromDate(endDateTime),
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
      <Text style={styles.label}>Wybierz opiekunkę/opiekuna:</Text>
      <View style={styles.pillsContainer}>
        {caregivers.length > 0 ? (
          caregivers.map((cg) => (
            <TouchableOpacity
              key={cg.id}
              style={[
                styles.caregiverPill,
                selectedCaregiver?.id === cg.id && styles.selectedPill,
              ]}
              onPress={() => setSelectedCaregiver(cg)}
            >
              {/* POPRAWKA: Wyświetlamy imię, a jeśli go nie ma - e-mail */}
              <Text
                style={[
                  styles.pillText,
                  selectedCaregiver?.id === cg.id && styles.selectedPillText,
                ]}
              >
                {cg.name || cg.email}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>
            Brak dostępnych opiekunów. Najpierw zaproś kogoś do profilu.
          </Text>
        )}
      </View>

      {/* Sekcja Daty i Czasu (reszta bez zmian) */}
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
          <Text style={styles.label}>Od:</Text>
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
                : "Czas"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.timeColumn}>
          <Text style={styles.label}>Do:</Text>
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
                : "Czas"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisibility(false)}
        locale="pl-PL"
        confirmTextIOS="Potwierdź"
        cancelTextIOS="Anuluj"
        minimumDate={new Date()}
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

      {/* Sekcja zadań (bez zmian) */}
      <Text style={styles.label}>Zadania do wykonania:</Text>
      <View style={styles.taskInputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Wpisz treść zadania..."
          placeholderTextColor={theme.colors.textSecondary}
          value={currentTask}
          onChangeText={setCurrentTask}
        />
        <TouchableOpacity style={styles.addTaskButton} onPress={handleAddTask}>
          <Text style={styles.addTaskButtonText}>Dodaj</Text>
        </TouchableOpacity>
      </View>

      {tasks.map((task, index) => (
        <View key={index} style={styles.taskItem}>
          <Text style={styles.taskText}>• {task}</Text>
        </View>
      ))}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={handleScheduleVisit}
        >
          <Text style={styles.buttonPrimaryText}>Zaplanuj wizytę</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Style (bez zmian)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.large,
    backgroundColor: theme.colors.background,
  },
  label: {
    fontSize: theme.fonts.body,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
    marginTop: theme.spacing.medium,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  caregiverPill: {
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.medium,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    margin: 4,
    backgroundColor: theme.colors.card,
  },
  selectedPill: {
    backgroundColor: theme.colors.primary,
  },
  pillText: {
    color: theme.colors.primary,
  },
  selectedPillText: {
    color: theme.colors.primaryText,
  },
  pickerButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: theme.spacing.medium,
    height: 50,
    justifyContent: "center",
  },
  pickerButtonText: {
    fontSize: theme.fonts.body,
    color: theme.colors.text,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: -theme.spacing.small / 2,
    marginRight: -theme.spacing.small / 2,
  },
  timeColumn: {
    flex: 1,
    marginHorizontal: theme.spacing.small / 2,
  },
  taskInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.medium,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: theme.spacing.medium,
    fontSize: theme.fonts.body,
    color: theme.colors.text,
    height: 50,
  },
  addTaskButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.medium,
    borderRadius: 10,
    marginLeft: theme.spacing.small,
    height: 50,
    justifyContent: "center",
  },
  addTaskButtonText: {
    color: theme.colors.primaryText,
    fontWeight: "bold",
  },
  taskItem: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.small,
    borderRadius: 5,
    marginBottom: theme.spacing.small,
  },
  taskText: {
    fontSize: theme.fonts.body,
    color: theme.colors.text,
  },
  buttonContainer: {
    marginTop: theme.spacing.large,
    marginBottom: theme.spacing.large * 2,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
    elevation: 3,
  },
  buttonPrimaryText: {
    color: theme.colors.primaryText,
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
});

export default ScheduleVisitScreen;
