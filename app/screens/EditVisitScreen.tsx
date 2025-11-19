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
  ActivityIndicator,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { theme } from "../../theme";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useAlert } from "../context/AlertContext";

const EditVisitScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { shiftId } = route.params;
  const [loading, setLoading] = useState(true);

  // Dane
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [selectedCaregiver, setSelectedCaregiver] = useState<any>(null);
  const [visitDate, setVisitDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<string[]>([]);
  const [patientId, setPatientId] = useState("");

  // UI
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isStartTimePickerVisible, setStartTimePickerVisibility] =
    useState(false);
  const [isEndTimePickerVisible, setEndTimePickerVisibility] = useState(false);
  const [currentTask, setCurrentTask] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  const { showAlert } = useAlert();
  const shiftDocRef = doc(db, "shifts", shiftId);

  useEffect(() => {
    const fetchShiftData = async () => {
      try {
        const shiftDoc = await getDoc(shiftDocRef);
        if (!shiftDoc.exists()) {
          showAlert("Błąd", "Wizyta nie istnieje.", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
          return;
        }
        const sData = shiftDoc.data();
        setPatientId(sData.patientId);
        setVisitDate(sData.start.toDate());
        setStartTime(sData.start.toDate());
        setEndTime(sData.end.toDate());
        setTasks(sData.tasks.map((t: any) => t.description));

        const patientDoc = await getDoc(doc(db, "patients", sData.patientId));
        if (patientDoc.exists() && patientDoc.data().caregiverIds) {
          const ids = patientDoc.data().caregiverIds;
          const cData = await Promise.all(
            ids.map(async (id: string) => {
              const u = await getDoc(doc(db, "users", id));
              return u.exists() ? { id: u.id, ...u.data() } : null;
            })
          );
          const validCaregivers = cData.filter((c) => c !== null);
          setCaregivers(validCaregivers);
          const currentCaregiver = validCaregivers.find(
            (c: any) => c.id === sData.caregiverId
          );
          setSelectedCaregiver(currentCaregiver || null);
        }
      } catch (error) {
        showAlert("Błąd", "Nie udało się pobrać danych.");
      }
      setLoading(false);
    };
    fetchShiftData();
  }, [shiftId]);

  const handleAddTask = () => {
    if (currentTask.trim() === "") return;
    setTasks([...tasks, currentTask.trim()]);
    setCurrentTask("");
  };

  const handleDeleteTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingText(tasks[index]);
  };

  const saveEditing = () => {
    if (editingText.trim() === "") return;
    const newTasks = [...tasks];
    newTasks[editingIndex!] = editingText.trim();
    setTasks(newTasks);
    setEditingIndex(null);
    setEditingText("");
  };

  // Aby użyć tego samego pola input co w ScheduleVisit, dodajemy obsługę przycisku
  const handleAddOrUpdateTask = () => {
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
  };

  const handleConfirmDate = (d: Date) => {
    setVisitDate(d);
    setDatePickerVisibility(false);
  };
  const handleConfirmStartTime = (t: Date) => {
    setStartTime(t);
    setStartTimePickerVisibility(false);
  };
  const handleConfirmEndTime = (t: Date) => {
    setEndTime(t);
    setEndTimePickerVisibility(false);
  };

  const handleUpdateVisit = async () => {
    if (!selectedCaregiver || !visitDate || !startTime || !endTime)
      return showAlert("Błąd", "Uzupełnij dane.");

    const start = new Date(visitDate);
    start.setHours(startTime.getHours(), startTime.getMinutes());
    const end = new Date(visitDate);
    end.setHours(endTime.getHours(), endTime.getMinutes());

    if (end <= start) return showAlert("Błąd", "Koniec musi być po starcie.");

    try {
      await updateDoc(shiftDocRef, {
        caregiverId: selectedCaregiver.id,
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
        tasks: tasks.map((t) => ({ description: t, isDone: false })),
      });
      showAlert("Sukces", "Wizyta zaktualizowana.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      showAlert("Błąd", "Nie udało się zapisać.");
    }
  };

  const handleDeleteVisit = () => {
    showAlert("Potwierdź", "Czy na pewno chcesz usunąć tę wizytę?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Usuń",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(shiftDocRef);
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        style={{ flex: 1 }}
        color={theme.colors.primary}
      />
    );

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
        <Text style={styles.label}>Opiekun:</Text>
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
                style={[
                  styles.pillText,
                  selectedCaregiver?.id === cg.id && styles.selectedPillText,
                ]}
              >
                {cg.name || cg.email}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Data i Czas:</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setDatePickerVisibility(true)}
        >
          <Text style={styles.pickerButtonText}>
            📅 {visitDate?.toLocaleDateString("pl-PL")}
          </Text>
        </TouchableOpacity>
        <View style={styles.timeRow}>
          <TouchableOpacity
            style={[styles.pickerButton, { flex: 1, marginRight: 5 }]}
            onPress={() => setStartTimePickerVisibility(true)}
          >
            <Text style={styles.pickerButtonText}>
              🕒{" "}
              {startTime?.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pickerButton, { flex: 1, marginLeft: 5 }]}
            onPress={() => setEndTimePickerVisibility(true)}
          >
            <Text style={styles.pickerButtonText}>
              🕒{" "}
              {endTime?.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </TouchableOpacity>
        </View>

        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={() => setDatePickerVisibility(false)}
          locale="pl-PL"
        />
        <DateTimePickerModal
          isVisible={isStartTimePickerVisible}
          mode="time"
          onConfirm={handleConfirmStartTime}
          onCancel={() => setStartTimePickerVisibility(false)}
          locale="pl-PL"
          is24Hour={true}
        />
        <DateTimePickerModal
          isVisible={isEndTimePickerVisible}
          mode="time"
          onConfirm={handleConfirmEndTime}
          onCancel={() => setEndTimePickerVisibility(false)}
          locale="pl_PL"
          is24Hour={true}
        />

        <Text style={styles.label}>Zadania:</Text>
        <View style={styles.taskInputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Treść zadania..."
            value={currentTask}
            onChangeText={setCurrentTask}
            placeholderTextColor={theme.colors.textSecondary}
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

        {tasks.map((task, index) => (
          <View key={index} style={styles.taskItemRow}>
            {editingIndex === index ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.editInput}
                  value={editingText}
                  onChangeText={setEditingText}
                  autoFocus
                />
                <TouchableOpacity onPress={saveEditing}>
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

        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={handleUpdateVisit}
        >
          <Text style={styles.buttonPrimaryText}>Zapisz Zmiany</Text>
        </TouchableOpacity>

        <View style={styles.deleteZone}>
          <TouchableOpacity
            style={styles.buttonDelete}
            onPress={handleDeleteVisit}
          >
            <Text style={styles.buttonDeleteText}>Usuń wizytę</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

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
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    margin: 4,
    backgroundColor: theme.colors.card,
  },
  selectedPill: { backgroundColor: theme.colors.primary },
  pillText: { color: theme.colors.primary },
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
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
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
  },
  addTaskButtonText: { color: "white", fontSize: 24, fontWeight: "bold" },
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
  saveEditText: {
    fontSize: 22,
    color: "green",
    fontWeight: "bold",
    marginLeft: 10,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    elevation: 4,
    marginTop: 30,
  },
  buttonPrimaryText: { color: "white", fontSize: 18, fontWeight: "bold" },
  deleteZone: {
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingTop: 20,
  },
  buttonDelete: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "red",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDeleteText: { color: "red", fontSize: 18, fontWeight: "bold" },
});

export default EditVisitScreen;
