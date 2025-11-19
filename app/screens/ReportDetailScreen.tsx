import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme";
import { doc, getDoc, Timestamp } from "firebase/firestore";

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
  start: Timestamp;
}

const ReportDetailScreen = ({ route }: { route: any }) => {
  const { shiftId } = route.params;
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<ShiftDetails | null>(null);

  useEffect(() => {
    const fetchShiftDetails = async () => {
      setLoading(true);
      try {
        const shiftDoc = await getDoc(doc(db, "shifts", shiftId));
        if (shiftDoc.exists()) {
          const data = shiftDoc.data();
          setShift({
            id: shiftDoc.id,
            patientName: data.patientName,
            tasks: data.tasks || [],
            mood: data.mood,
            energy: data.energy,
            notes: data.notes,
            start: data.start,
          });
        } else {
          Alert.alert("Błąd", "Nie znaleziono raportu.");
        }
      } catch (error) {
        Alert.alert("Błąd", "Problem z pobraniem danych.");
      }
      setLoading(false);
    };
    fetchShiftDetails();
  }, [shiftId]);

  const translateMood = (mood?: string) => {
    if (mood === "happy") return { text: "Dobry", emoji: "😄" };
    if (mood === "neutral") return { text: "Neutralny", emoji: "🙂" };
    if (mood === "sad") return { text: "Słaby", emoji: "😟" };
    return { text: "Brak danych", emoji: "❓" };
  };

  const translateEnergy = (energy?: string) => {
    if (energy === "high") return "Dużo";
    if (energy === "medium") return "Średnio";
    if (energy === "low") return "Mało";
    return "Brak danych";
  };

  if (loading)
    return <ActivityIndicator size="large" style={styles.loadingContainer} />;
  if (!shift) return <Text>Błąd danych.</Text>;

  const mood = translateMood(shift.mood);
  const energy = translateEnergy(shift.energy);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.patientName}>{shift.patientName}</Text>
      <Text style={styles.date}>
        Raport z dnia: {shift.start.toDate().toLocaleDateString("pl-PL")}
      </Text>

      <View style={styles.reportRow}>
        <View style={styles.reportBox}>
          <Text style={styles.reportLabel}>Nastrój</Text>
          <Text style={styles.reportEmoji}>{mood.emoji}</Text>
          <Text style={styles.reportValue}>{mood.text}</Text>
        </View>
        <View style={styles.reportBox}>
          <Text style={styles.reportLabel}>Energia</Text>
          <Text style={styles.reportValueLarge}>{energy}</Text>
        </View>
      </View>

      <Text style={styles.title}>Wykonane zadania:</Text>
      {shift.tasks.length > 0 ? (
        shift.tasks.map((item, index) => (
          <View key={index} style={styles.taskCard}>
            <Text
              style={[
                styles.checkmark,
                item.isDone ? styles.checkmarkDone : styles.checkmarkPending,
              ]}
            >
              {item.isDone ? "✔" : "✘"}
            </Text>
            {/* POPRAWKA: Usunięto przekreślenie */}
            <Text
              style={[styles.taskDescription, item.isDone && styles.taskDone]}
            >
              {item.description}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Brak zadań.</Text>
      )}

      <Text style={styles.title}>Notatki Opiekuna:</Text>
      <View style={styles.notesContainer}>
        <Text style={styles.notesText}>{shift.notes || "Brak notatek."}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.large,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  patientName: {
    fontSize: theme.fonts.title,
    fontWeight: "bold",
    textAlign: "center",
    color: theme.colors.text,
  },
  date: {
    fontSize: theme.fonts.subtitle,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
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
  reportLabel: { fontSize: 16, color: "gray", fontWeight: "bold" },
  reportEmoji: { fontSize: 40, marginVertical: 5 },
  reportValue: { fontSize: 20, fontWeight: "bold", color: theme.colors.text },
  reportValueLarge: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text,
    marginTop: 15,
    marginBottom: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 10,
    color: theme.colors.text,
  },
  taskCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  checkmark: { fontSize: 20, marginRight: 15 },
  checkmarkDone: { color: "green" },
  checkmarkPending: { color: "red" },
  taskDescription: { fontSize: 16, flex: 1 },
  taskDone: {
    color: theme.colors.textSecondary, // Tylko szary kolor
  },
  emptyText: { color: "gray", fontStyle: "italic", marginBottom: 20 },
  notesContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    minHeight: 100,
    marginBottom: 50,
  },
  notesText: { fontSize: 16, color: theme.colors.text, fontStyle: "italic" },
});

export default ReportDetailScreen;
