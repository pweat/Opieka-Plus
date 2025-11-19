import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { theme } from "../../theme";
import { doc, getDoc, collection, addDoc, Timestamp } from "firebase/firestore";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useAlert } from "../context/AlertContext";

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

  const [visitDate, setVisitDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isStartTimePickerVisible, setStartTimePickerVisibility] =
    useState(false);
  const [isEndTimePickerVisible, setEndTimePickerVisibility] = useState(false);

  const [tasks, setTasks] = useState<string[]>([]);
  const [currentTask, setCurrentTask] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  const { showAlert } = useAlert();

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

  // Logika Zadań
  const handleAddTask = () => {
    if (currentTask.trim() === "") return;
    setTasks([...tasks, currentTask.trim()]);
    setCurrentTask("");
  };

  const handleDeleteTask = (indexToDelete: number) => {
    setTasks((currentTasks) =>
      currentTasks.filter((_, index) => index !== indexToDelete)
    );
    if (editingIndex === indexToDelete) setEditingIndex(null);
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingText(tasks[index]);
  };

  const saveEditing = () => {
    if (editingText.trim() === "") return;
    const updatedTasks = [...tasks];
    updatedTasks[editingIndex!] = editingText.trim();
    setTasks(updatedTasks);
    setEditingIndex(null);
    setEditingText("");
  };

  // Logika Kalendarza
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
      showAlert("Błąd", "Uzupełnij wszystkie dane wizyty.");
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
        showAlert(
          "Błąd",
          "Godzina zakończenia musi być późniejsza niż startu."
        );
        return;
      }

      const tasksForDb = tasks.map((taskText) => ({
        description: taskText,
        isDone: false,
      }));

      await addDoc(collection(db, "shifts"), {
        patientId,
        patientName,
        caregiverId: selectedCaregiver.id,
        ownerId: auth.currentUser?.uid,
        start: Timestamp.fromDate(startDateTime),
        end: Timestamp.fromDate(endDateTime),
        status: "scheduled",
        tasks: tasksForDb,
      });

      showAlert("Sukces", "Wizyta zaplanowana.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      showAlert("Błąd", "Nie udało się zapisać.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.kbContainer}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
            <Text style={styles.emptyText}>Brak dostępnych opiekunów.</Text>
          )}
        </View>

        <Text style={styles.label}>Termin wizyty:</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setDatePickerVisibility(true)}
        >
          <Text style={styles.pickerButtonText}>
            📅{" "}
            {visitDate ? visitDate.toLocaleDateString("pl-PL") : "Wybierz datę"}
          </Text>
        </TouchableOpacity>

        <View style={styles.timeRow}>
          <View style={styles.timeColumn}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setStartTimePickerVisibility(true)}
            >
              <Text style={styles.pickerButtonText}>
                🕒 Od:{" "}
                {startTime
                  ? startTime.toLocaleTimeString("pl-PL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timeColumn}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setEndTimePickerVisibility(true)}
            >
              <Text style={styles.pickerButtonText}>
                🕒 Do:{" "}
                {endTime
                  ? endTime.toLocaleTimeString("pl-PL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
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
          locale="pl-PL"
          confirmTextIOS="Potwierdź"
          cancelTextIOS="Anuluj"
          is24Hour={true}
        />
        <DateTimePickerModal
          isVisible={isEndTimePickerVisible}
          mode="time"
          onConfirm={handleConfirmEndTime}
          onCancel={() => setEndTimePickerVisibility(false)}
          locale="pl-PL"
          confirmTextIOS="Potwierdź"
          cancelTextIOS="Anuluj"
          is24Hour={true}
        />

        <Text style={styles.label}>Lista zadań:</Text>

        <View style={styles.taskInputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Np. Podać leki, spacer..."
            placeholderTextColor={theme.colors.textSecondary}
            value={currentTask}
            onChangeText={setCurrentTask}
          />
          <TouchableOpacity
            style={styles.addTaskButton}
            onPress={handleAddOrUpdateTask}
          >
            <Text style={styles.addTaskButtonText}>
              {editingIndex !== null ? "Zmień" : "+"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pamiętaj, aby wkleić tu funkcję handleAddOrUpdateTask, jeśli jej brakuje w tym bloku, 
            jest ona taka sama jak wcześniej, ale używa editingIndex */}

        <View style={styles.tasksList}>
          {tasks.map((task, index) => (
            <View key={index} style={styles.taskItemRow}>
              {editingIndex === index ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.editInput}
                    value={editingText}
                    onChangeText={setEditingText}
                    autoFocus={true}
                  />
                  <TouchableOpacity
                    onPress={saveEditing}
                    style={styles.saveEditButton}
                  >
                    <Text style={styles.saveEditText}>✔</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.taskText}>{task}</Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      onPress={() => startEditing(index)}
                      style={styles.iconButton}
                    >
                      <Text style={styles.editIcon}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteTask(index)}
                      style={styles.iconButton}
                    >
                      <Text style={styles.deleteIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}

          {tasks.length === 0 && (
            <Text style={styles.noTasksText}>Brak zadań na liście.</Text>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={handleScheduleVisit}
          >
            <Text style={styles.buttonPrimaryText}>Zatwierdź i Zaplanuj</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // Brakuje funkcji pomocniczej w renderze, dodaję ją tutaj dla kompletności:
  function handleAddOrUpdateTask() {
    if (currentTask.trim() === "") return;
    if (editingIndex !== null) {
      const updatedTasks = [...tasks];
      updatedTasks[editingIndex] = currentTask.trim();
      setTasks(updatedTasks);
      setEditingIndex(null);
    } else {
      setTasks([...tasks, currentTask.trim()]);
    }
    setCurrentTask("");
  }
};

// Style (bez zmian)
const styles = StyleSheet.create({
  kbContainer: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  scrollContent: { padding: theme.spacing.large, paddingBottom: 50 },
  label: {
    fontSize: theme.fonts.body,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 15,
  },
  pillsContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  caregiverPill: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.card,
  },
  selectedPill: { backgroundColor: theme.colors.primary },
  pillText: { color: theme.colors.primary, fontWeight: "500" },
  selectedPillText: { color: "white" },
  pickerButton: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  pickerButtonText: { fontSize: 16, color: theme.colors.text },
  timeRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  timeColumn: { flex: 1 },
  taskInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    height: 50,
  },
  addTaskButton: {
    backgroundColor: theme.colors.primary,
    width: 50,
    height: 50,
    borderRadius: 10,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  addTaskButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },
  tasksList: { marginTop: 5 },
  taskItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 1,
    minHeight: 50,
  },
  taskText: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
    marginRight: 10,
  },
  actionButtons: { flexDirection: "row" },
  iconButton: { padding: 5, marginLeft: 8 },
  editIcon: { fontSize: 20, color: "#2196F3" },
  deleteIcon: { fontSize: 20, color: "red", fontWeight: "bold" },
  editContainer: { flex: 1, flexDirection: "row", alignItems: "center" },
  editInput: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary,
    padding: 5,
    fontSize: 16,
    color: theme.colors.text,
  },
  saveEditButton: { marginLeft: 10, padding: 5 },
  saveEditText: {
    fontSize: 22,
    color: "green",
    fontWeight: "bold",
    marginLeft: 10,
  },
  noTasksText: {
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 5,
  },
  buttonContainer: { marginTop: 30, marginBottom: 50 },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    elevation: 4,
  },
  buttonPrimaryText: { color: "white", fontSize: 18, fontWeight: "bold" },
  emptyText: { color: theme.colors.textSecondary, fontStyle: "italic" },
});

export default ScheduleVisitScreen;
