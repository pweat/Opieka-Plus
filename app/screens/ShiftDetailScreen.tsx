import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme";
import { doc, getDoc, updateDoc } from "firebase/firestore";

interface Task {
  description: string;
  isDone: boolean;
}
interface ShiftDetails {
  id: string;
  patientName: string;
  tasks: Task[];
  mood?: "happy" | "neutral" | "sad";
  energy?: "low" | "medium" | "high";
  notes?: string;
  status?: string; // Dodajemy status
}

const ShiftDetailScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  // Dodajemy navigation
  const { shiftId } = route.params;
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<ShiftDetails | null>(null);
  const [notes, setNotes] = useState("");
  const shiftDocRef = doc(db, "shifts", shiftId);

  useEffect(() => {
    const fetchShiftDetails = async () => {
      setLoading(true);
      try {
        const shiftDoc = await getDoc(shiftDocRef);
        if (shiftDoc.exists()) {
          const data = shiftDoc.data();
          setShift({
            id: shiftDoc.id,
            patientName: data.patientName,
            tasks: data.tasks || [],
            mood: data.mood,
            energy: data.energy,
            notes: data.notes,
            status: data.status,
          });
          setNotes(data.notes || "");
        } else {
          Alert.alert("Błąd", "Nie można znaleźć tej wizyty.");
        }
      } catch (error) {
        Alert.alert("Błąd", "Wystąpił problem z pobraniem danych.");
      }
      setLoading(false);
    };
    fetchShiftDetails();
  }, [shiftId]);

  const handleToggleTask = async (taskIndex: number) => {
    if (!shift) return;
    const newTasks = [...shift.tasks];
    newTasks[taskIndex].isDone = !newTasks[taskIndex].isDone;
    setShift({ ...shift, tasks: newTasks });
    try {
      await updateDoc(shiftDocRef, { tasks: newTasks });
    } catch (e) {}
  };

  const handleUpdateReport = async (field: keyof ShiftDetails, value: any) => {
    if (!shift) return;
    setShift((prevShift) => ({ ...prevShift!, [field]: value }));
    try {
      await updateDoc(shiftDocRef, { [field]: value });
    } catch (e) {}
  };

  const handleSaveNotes = async () => {
    try {
      await updateDoc(shiftDocRef, { notes: notes });
      Alert.alert("Sukces", "Notatki zostały zapisane.");
    } catch (e) {
      Alert.alert("Błąd", "Nie udało się zapisać notatek.");
    }
  };

  // === NOWA FUNKCJA: ZAKOŃCZ WIZYTĘ ===
  const handleFinishShift = () => {
    Alert.alert(
      "Zakończyć wizytę?",
      "Wizyta zniknie z Twojej listy zadań i zostanie przeniesiona do historii.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Zakończ i Zamknij",
          onPress: async () => {
            try {
              // Zmieniamy status na 'completed'
              await updateDoc(shiftDocRef, { status: "completed" });
              // Wracamy do ekranu głównego
              navigation.goBack();
            } catch (error) {
              Alert.alert("Błąd", "Nie udało się zakończyć wizyty.");
            }
          },
        },
      ]
    );
  };

  if (loading)
    return <ActivityIndicator size="large" style={styles.loadingContainer} />;
  if (!shift)
    return (
      <View style={styles.container}>
        <Text>Błąd danych.</Text>
      </View>
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.kbContainer}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.patientName}>{shift.patientName}</Text>

        <Text style={styles.title}>Zadania na dziś:</Text>
        {shift.tasks.length > 0 ? (
          shift.tasks.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.taskCard}
              onPress={() => handleToggleTask(index)}
            >
              <View
                style={[styles.checkbox, item.isDone && styles.checkboxDone]}
              >
                {item.isDone && <Text style={styles.checkmark}>✔</Text>}
              </View>
              <Text
                style={[styles.taskDescription, item.isDone && styles.taskDone]}
              >
                {item.description}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>Brak zadań.</Text>
        )}

        <Text style={styles.title}>Nastrój:</Text>
        <View style={styles.optionsContainer}>
          {["happy", "neutral", "sad"].map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.moodButton,
                shift.mood === m && styles.moodSelected,
              ]}
              onPress={() => handleUpdateReport("mood", m)}
            >
              <Text style={styles.moodEmoji}>
                {m === "happy" ? "😄" : m === "neutral" ? "😐" : "😟"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.title}>Energia:</Text>
        <View style={styles.optionsContainer}>
          {["low", "medium", "high"].map((e) => (
            <TouchableOpacity
              key={e}
              style={[
                styles.optionButton,
                shift.energy === e && styles.optionSelected,
              ]}
              onPress={() => handleUpdateReport("energy", e)}
            >
              <Text
                style={[
                  styles.optionText,
                  shift.energy === e && styles.optionSelectedText,
                ]}
              >
                {e === "low" ? "Mało" : e === "medium" ? "Średnio" : "Dużo"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.title}>Notatki:</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Wpisz notatki..."
          multiline
          value={notes}
          onChangeText={setNotes}
        />
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={handleSaveNotes}
        >
          <Text style={styles.buttonSecondaryText}>Zapisz tylko notatki</Text>
        </TouchableOpacity>

        {/* ODSTĘP */}
        <View style={{ height: 30 }} />

        {/* === NOWY PRZYCISK ZAKOŃCZENIA === */}
        <TouchableOpacity
          style={styles.buttonFinish}
          onPress={handleFinishShift}
        >
          <Text style={styles.buttonFinishText}>✅ ZAKOŃCZ WIZYTĘ</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  kbContainer: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  scrollContainer: { padding: theme.spacing.large, paddingBottom: 50 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  patientName: {
    fontSize: theme.fonts.title,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: theme.colors.text,
  },
  title: {
    fontSize: theme.fonts.subtitle,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
    color: theme.colors.text,
  },
  taskCard: {
    backgroundColor: theme.colors.card,
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginRight: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: theme.colors.primary },
  checkmark: { color: "white", fontSize: 14 },
  taskDescription: { fontSize: 16, color: theme.colors.text, flex: 1 },
  taskDone: { textDecorationLine: "line-through", color: "gray" },
  emptyText: { color: "gray", fontStyle: "italic", textAlign: "center" },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  moodButton: {
    padding: 10,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "white",
  },
  moodEmoji: { fontSize: 35 },
  moodSelected: {
    backgroundColor: "#e0e0e0",
    borderColor: theme.colors.primary,
  },
  optionButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: "white",
    alignItems: "center",
  },
  optionSelected: { backgroundColor: theme.colors.primary },
  optionText: { color: theme.colors.primary },
  optionSelectedText: { color: "white", fontWeight: "bold" },
  notesInput: {
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 16,
  },

  // Button do notatek (teraz "drugorzędny")
  buttonSecondary: { marginTop: 10, padding: 10, alignItems: "center" },
  buttonSecondaryText: {
    color: theme.colors.textSecondary,
    textDecorationLine: "underline",
  },

  // Główny przycisk zakończenia
  buttonFinish: {
    backgroundColor: "#2e7d32",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    elevation: 4,
    marginBottom: 20,
  },
  buttonFinishText: { color: "white", fontSize: 18, fontWeight: "bold" },
});

export default ShiftDetailScreen;
