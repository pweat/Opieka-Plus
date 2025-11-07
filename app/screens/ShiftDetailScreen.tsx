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

  // Funkcja handleToggleTask (bez zmian)
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

  // Funkcja handleUpdateReport (bez zmian)
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
    return <ActivityIndicator size="large" style={styles.loadingContainer} />;
  }

  if (!shift) {
    return (
      <View style={styles.container}>
        <Text>Nie znaleziono danych wizyty.</Text>
      </View>
    );
  }

  return (
    // ScrollView jest teraz JEDYNYM elementem przewijanym
    <ScrollView style={styles.container}>
      <Text style={styles.patientName}>{shift.patientName}</Text>

      {/* SEKCJA ZADAŃ - POPRAWKA BŁĘDU 1 */}
      {/* Zamiast FlatList, używamy prostego mapowania. 
          To rozwiązuje błąd zagnieżdżonych list. */}
      <Text style={styles.title}>Zadania na dziś:</Text>
      {shift.tasks.length > 0 ? (
        shift.tasks.map((item, index) => (
          <TouchableOpacity
            key={`${item.description}-${index}`} // Klucz musi być unikalny
            style={styles.taskCard}
            onPress={() => handleToggleTask(index)}
          >
            <View style={styles.checkbox}>
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

      {/* SEKCJA NASTRÓJ (bez zmian) */}
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

      {/* SEKCJA ENERGIA (bez zmian) */}
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
        {/* ... pozostałe przyciski energii ... */}
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

      {/* SEKCJA NOTATKI - POPRAWKA BŁĘDU 2 */}
      <Text style={styles.title}>Dodatkowe notatki:</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="Wpisz swoje obserwacje..."
        multiline
        value={notes}
        onChangeText={setNotes}
        // Używamy 'onBlur' zamiast 'onEndEditing'
        onBlur={() => handleUpdateReport("notes", notes)}
      />
    </ScrollView>
  );
};

// Style (dodany loadingContainer)
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  patientName: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 20,
  },
  taskCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#007bff",
    marginRight: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    fontSize: 14,
    color: "#007bff",
  },
  taskDescription: {
    fontSize: 16,
    flex: 1,
  },
  taskDone: {
    textDecorationLine: "line-through",
    color: "gray",
  },
  emptyText: {
    color: "gray",
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  moodButton: {
    padding: 10,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "transparent",
  },
  moodEmoji: {
    fontSize: 40,
  },
  moodSelected: {
    backgroundColor: "#e0e0e0",
    borderColor: "#c0c0c0",
  },
  optionButton: {
    flex: 1,
    paddingVertical: 15,
    marginHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007bff",
    alignItems: "center",
  },
  optionSelected: {
    backgroundColor: "#007bff",
  },
  optionText: {
    fontSize: 16,
    color: "#007bff",
  },
  optionSelectedText: {
    color: "white",
  },
  notesInput: {
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 50,
  },
});

export default ShiftDetailScreen;
