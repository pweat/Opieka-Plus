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
} from "react-native";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme"; // Importujemy motyw
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
  const { shiftId } = route.params;
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<ShiftDetails | null>(null);
  const [notes, setNotes] = useState("");

  const shiftDocRef = doc(db, "shifts", shiftId);

  // Funkcja pobierania danych (bez zmian)
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

  // Funkcja odhaczania zadań (bez zmian)
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

  // Funkcja aktualizacji raportu (bez zmian)
  const handleUpdateReport = async (field: keyof ShiftDetails, value: any) => {
    if (!shift) return;
    setShift((prevShift) => ({ ...prevShift!, [field]: value }));
    try {
      await updateDoc(shiftDocRef, { [field]: value });
    } catch (error) {
      Alert.alert("Błąd", `Nie udało się zapisać pola: ${field}.`);
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
    <ScrollView style={styles.container}>
      <Text style={styles.patientName}>{shift.patientName}</Text>

      {/* SEKCJA ZADAŃ */}
      <Text style={styles.title}>Zadania na dziś:</Text>
      {shift.tasks.length > 0 ? (
        shift.tasks.map((item, index) => (
          <TouchableOpacity
            key={`${item.description}-${index}`}
            style={styles.taskCard} // Używamy stylu karty
            onPress={() => handleToggleTask(index)}
          >
            <View style={[styles.checkbox, item.isDone && styles.checkboxDone]}>
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
        onBlur={() => handleUpdateReport("notes", notes)}
      />
    </ScrollView>
  );
};

// Nowy, kompletny arkusz stylów z motywem
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.large,
    backgroundColor: theme.colors.background, // Tło z motywu
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: theme.colors.card, // Białe tło
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
    borderColor: theme.colors.primary, // Brązowa ramka
    marginRight: theme.spacing.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: theme.colors.primary, // Wypełnienie brązowe
  },
  checkmark: {
    fontSize: 14,
    color: theme.colors.primaryText, // Biały ptaszek
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
    backgroundColor: "#e0e0e0", // Lepsze podświetlenie
    borderColor: theme.colors.primary, // Brązowa ramka
  },
  optionButton: {
    flex: 1,
    paddingVertical: theme.spacing.medium,
    marginHorizontal: theme.spacing.small / 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary, // Brązowa ramka
    backgroundColor: theme.colors.card, // Białe tło
    alignItems: "center",
  },
  optionSelected: {
    backgroundColor: theme.colors.primary, // Brązowe tło
  },
  optionText: {
    fontSize: theme.fonts.body,
    color: theme.colors.primary, // Brązowy tekst
  },
  optionSelectedText: {
    color: theme.colors.primaryText, // Biały tekst
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
    marginBottom: 50,
    color: theme.colors.text,
  },
});

export default ShiftDetailScreen;
