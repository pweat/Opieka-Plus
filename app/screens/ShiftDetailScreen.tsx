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

// Typy (bez zmian)
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
}

const ShiftDetailScreen = ({ route }: { route: any }) => {
  // Cała logika (useState, useEffect, funkcje handle...)
  // pozostaje BEZ ZMIAN.
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
    } catch (error) {
      Alert.alert("Błąd", "Nie udało się zapisać zmiany zadania.");
    }
  };

  const handleUpdateReport = async (field: keyof ShiftDetails, value: any) => {
    if (!shift) return;
    setShift((prevShift) => ({ ...prevShift!, [field]: value }));
    try {
      await updateDoc(shiftDocRef, { [field]: value });
    } catch (error) {
      Alert.alert("Błąd", `Nie udało się zapisać pola: ${field}.`);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await updateDoc(shiftDocRef, { notes: notes });
      Alert.alert("Sukces", "Notatki zostały zapisane.");
    } catch (error) {
      Alert.alert("Błąd", "Nie udało się zapisać notatek.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!shift) {
    return (
      <View style={styles.container}>
        <Text>Nie znaleziono danych wizyty.</Text>
      </View>
    );
  }

  return (
    // 1. Używamy KeyboardAvoidingView z behavior="padding"
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      style={styles.kbContainer}
    >
      {/* 2. ScrollView jest wewnątrz */}
      <ScrollView
        style={styles.container} // Styl tła
        contentContainerStyle={styles.scrollContainer} // Styl zawartości
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.patientName}>{shift.patientName}</Text>

        {/* SEKCJA ZADAŃ */}
        <Text style={styles.title}>Zadania na dziś:</Text>
        {shift.tasks.length > 0 ? (
          shift.tasks.map((item, index) => (
            <TouchableOpacity
              key={`${item.description}-${index}`}
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
          <Text style={styles.emptyText}>Brak zadań na tę wizytę.</Text>
        )}

        {/* SEKCJA NASTRÓJ */}
        <Text style={styles.title}>Nastrój podopiecznego:</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.moodButton,
              shift.mood === "happy" && styles.moodSelected,
            ]}
            onPress={() => handleUpdateReport("mood", "happy")}
          >
            <Text style={styles.moodEmoji}>😄</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.moodButton,
              shift.mood === "neutral" && styles.moodSelected,
            ]}
            onPress={() => handleUpdateReport("mood", "neutral")}
          >
            <Text style={styles.moodEmoji}>🙂</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.moodButton,
              shift.mood === "sad" && styles.moodSelected,
            ]}
            onPress={() => handleUpdateReport("mood", "sad")}
          >
            <Text style={styles.moodEmoji}>😟</Text>
          </TouchableOpacity>
        </View>

        {/* SEKCJA ENERGIA */}
        <Text style={styles.title}>Poziom energii:</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              shift.energy === "low" && styles.optionSelected,
            ]}
            onPress={() => handleUpdateReport("energy", "low")}
          >
            <Text
              style={[
                styles.optionText,
                shift.energy === "low" && styles.optionSelectedText,
              ]}
            >
              Mało
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionButton,
              shift.energy === "medium" && styles.optionSelected,
            ]}
            onPress={() => handleUpdateReport("energy", "medium")}
          >
            <Text
              style={[
                styles.optionText,
                shift.energy === "medium" && styles.optionSelectedText,
              ]}
            >
              Średnio
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionButton,
              shift.energy === "high" && styles.optionSelected,
            ]}
            onPress={() => handleUpdateReport("energy", "high")}
          >
            <Text
              style={[
                styles.optionText,
                shift.energy === "high" && styles.optionSelectedText,
              ]}
            >
              Dużo
            </Text>
          </TouchableOpacity>
        </View>

        {/* SEKCJA NOTATKI */}
        <Text style={styles.title}>Dodatkowe notatki:</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Wpisz swoje obserwacje..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={handleSaveNotes}
        >
          <Text style={styles.buttonPrimaryText}>Zapisz Notatki</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// 3. AKTUALIZUJEMY STYLE
const styles = StyleSheet.create({
  kbContainer: {
    flex: 1,
    backgroundColor: theme.colors.background, // Tło dla całego KAV
  },
  container: {
    // Ten styl jest teraz *tylko* dla ScrollView
    flex: 1, // Pozwalamy mu zająć całą dostępną przestrzeń
  },
  scrollContainer: {
    // Styl dla *zawartości* wewnątrz ScrollView
    padding: theme.spacing.large,
    flexGrow: 1, // Pozwala zawartości rosnąć
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    padding: theme.spacing.large,
  },
  patientName: {
    fontSize: theme.fonts.title,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: theme.spacing.large,
    color: theme.colors.text,
  },
  title: {
    fontSize: theme.fonts.subtitle,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.medium,
    marginTop: theme.spacing.medium,
  },
  taskCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.medium,
    borderRadius: 10,
    marginBottom: theme.spacing.small,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginRight: theme.spacing.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: theme.colors.primary,
  },
  checkmark: {
    fontSize: 14,
    color: theme.colors.primaryText,
  },
  taskDescription: {
    fontSize: theme.fonts.body,
    color: theme.colors.text,
    flex: 1,
  },
  taskDone: {
    textDecorationLine: "line-through",
    color: theme.colors.textSecondary,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.small,
    fontStyle: "italic",
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: theme.spacing.medium,
  },
  moodButton: {
    padding: theme.spacing.small,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: theme.colors.card,
  },
  moodEmoji: {
    fontSize: 40,
  },
  moodSelected: {
    backgroundColor: "#e0e0e0",
    borderColor: theme.colors.primary,
  },
  optionButton: {
    flex: 1,
    paddingVertical: theme.spacing.medium,
    marginHorizontal: theme.spacing.small / 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.card,
    alignItems: "center",
  },
  optionSelected: {
    backgroundColor: theme.colors.primary,
  },
  optionText: {
    fontSize: theme.fonts.body,
    color: theme.colors.primary,
  },
  optionSelectedText: {
    color: theme.colors.primaryText,
    fontWeight: "bold",
  },
  notesInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: theme.spacing.medium,
    fontSize: theme.fonts.body,
    minHeight: 120,
    textAlignVertical: "top",
    color: theme.colors.text,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
    elevation: 3,
    marginTop: theme.spacing.medium,
    marginBottom: theme.spacing.large, // Zmniejszony margines dolny, aby lepiej pasował
  },
  buttonPrimaryText: {
    color: theme.colors.primaryText,
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
});

export default ShiftDetailScreen;
