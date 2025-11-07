import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView, // Zmieniamy z FlatList na ScrollView
} from "react-native";
import { db } from "../../firebaseConfig";
import { doc, getDoc, Timestamp } from "firebase/firestore"; // Importujemy Timestamp

// Definiujemy typy
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
  start: Timestamp; // Dodajemy datę startu
}

const ReportDetailScreen = ({ route }: { route: any }) => {
  const { shiftId } = route.params;
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<ShiftDetails | null>(null);

  useEffect(() => {
    const fetchShiftDetails = async () => {
      setLoading(true);
      try {
        const shiftDocRef = doc(db, "shifts", shiftId);
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
            start: data.start, // Pobieramy datę startu
          });
        } else {
          Alert.alert("Błąd", "Nie można znaleźć tego raportu.");
        }
      } catch (error) {
        Alert.alert("Błąd", "Wystąpił problem z pobraniem danych.");
      }
      setLoading(false);
    };
    fetchShiftDetails();
  }, [shiftId]);

  if (loading) {
    return <ActivityIndicator size="large" style={styles.loadingContainer} />;
  }

  if (!shift) {
    return (
      <View style={styles.container}>
        <Text>Nie znaleziono danych raportu.</Text>
      </View>
    );
  }

  // Funkcja pomocnicza do tłumaczenia nastroju
  const translateMood = (mood: string) => {
    if (mood === "happy") return "Dobry 😄";
    if (mood === "neutral") return "Neutralny 🙂";
    if (mood === "sad") return "Słaby 😟";
    return "Nie zaraportowano";
  };

  // Funkcja pomocnicza do tłumaczenia energii
  const translateEnergy = (energy: string) => {
    if (energy === "high") return "Dużo";
    if (energy === "medium") return "Średnio";
    if (energy === "low") return "Mało";
    return "Nie zaraportowano";
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.patientName}>{shift.patientName}</Text>
      <Text style={styles.date}>
        Raport z dnia: {shift.start.toDate().toLocaleDateString("pl-PL")}
      </Text>

      {/* Sekcja Nastrój i Energia */}
      <View style={styles.reportRow}>
        <View style={styles.reportBox}>
          <Text style={styles.reportLabel}>Nastrój:</Text>
          <Text style={styles.reportValue}>
            {translateMood(shift.mood || "")}
          </Text>
        </View>
        <View style={styles.reportBox}>
          <Text style={styles.reportLabel}>Energia:</Text>
          <Text style={styles.reportValue}>
            {translateEnergy(shift.energy || "")}
          </Text>
        </View>
      </View>

      {/* Sekcja Zadania */}
      <Text style={styles.title}>Wykonane zadania:</Text>
      {shift.tasks.length > 0 ? (
        shift.tasks.map((item, index) => (
          <View key={index} style={styles.taskCard}>
            <Text style={styles.checkmark}>{item.isDone ? "✔" : "✘"}</Text>
            <Text
              style={[styles.taskDescription, item.isDone && styles.taskDone]}
            >
              {item.description}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Brak zadań na tę wizytę.</Text>
      )}

      {/* Sekcja Notatki */}
      <Text style={styles.title}>Notatki Opiekuna:</Text>
      <View style={styles.notesContainer}>
        <Text style={styles.notesText}>{shift.notes || "Brak notatek."}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, padding: 20 },
  patientName: { fontSize: 28, fontWeight: "bold", textAlign: "center" },
  date: { fontSize: 18, color: "gray", textAlign: "center", marginBottom: 20 },

  reportRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  reportBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    margin: 5,
    elevation: 2,
  },
  reportLabel: { fontSize: 16, color: "gray" },
  reportValue: { fontSize: 20, fontWeight: "bold", marginTop: 5 },

  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10, marginTop: 10 },

  taskCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  checkmark: { fontSize: 20, marginRight: 15, color: "#007bff" },
  taskDescription: { fontSize: 16, flex: 1 },
  taskDone: { textDecorationLine: "line-through", color: "gray" },
  emptyText: { color: "gray", fontStyle: "italic", marginBottom: 20 },

  notesContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    minHeight: 100,
    marginBottom: 50,
  },
  notesText: { fontSize: 16 },
});

export default ReportDetailScreen;
