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
import { theme } from "../../theme"; // Importujemy motyw
import { doc, getDoc, Timestamp } from "firebase/firestore";

// Definicje typów (bez zmian)
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

  // Funkcja pobierania danych (bez zmian)
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
            start: data.start,
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

  // Funkcje pomocnicze do tłumaczenia (bez zmian)
  const translateMood = (mood?: string): { text: string; emoji: string } => {
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
        <Text>Nie znaleziono danych raportu.</Text>
      </View>
    );
  }

  const mood = translateMood(shift.mood);
  const energy = translateEnergy(shift.energy);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.patientName}>{shift.patientName}</Text>
      <Text style={styles.date}>
        Raport z dnia: {shift.start.toDate().toLocaleDateString("pl-PL")}
      </Text>

      {/* Sekcja Nastrój i Energia */}
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

      {/* Sekcja Zadania */}
      <Text style={styles.title}>Wykonane zadania:</Text>
      {shift.tasks.length > 0 ? (
        shift.tasks.map((item, index) => (
          <View key={index} style={styles.taskCard}>
            {/* Zmieniamy "ptaszek" na bardziej czytelny */}
            <Text
              style={[
                styles.checkmark,
                item.isDone ? styles.checkmarkDone : styles.checkmarkPending,
              ]}
            >
              {item.isDone ? "✔" : "✘"}
            </Text>
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
    color: theme.colors.text,
  },
  date: {
    fontSize: theme.fonts.subtitle,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.large,
  },
  reportRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: theme.spacing.medium,
  },
  reportBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.colors.card, // Biała karta
    padding: theme.spacing.medium,
    borderRadius: 10,
    marginHorizontal: theme.spacing.small,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  reportLabel: {
    fontSize: theme.fonts.body,
    color: theme.colors.textSecondary,
    fontWeight: "bold",
  },
  reportEmoji: {
    fontSize: 40,
    marginVertical: theme.spacing.small,
  },
  reportValue: {
    fontSize: theme.fonts.subtitle,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  reportValueLarge: {
    // Większa czcionka dla energii
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text,
    marginTop: theme.spacing.medium,
    marginBottom: theme.spacing.small,
  },
  title: {
    fontSize: theme.fonts.subtitle,
    fontWeight: "bold",
    marginBottom: theme.spacing.medium,
    marginTop: theme.spacing.large, // Większy odstęp
    color: theme.colors.text,
  },
  taskCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.medium,
    borderRadius: 10,
    marginBottom: theme.spacing.small,
    flexDirection: "row",
    alignItems: "center",
  },
  checkmark: {
    fontSize: 20,
    marginRight: theme.spacing.medium,
  },
  checkmarkDone: {
    color: "green", // Zielony dla wykonanych
  },
  checkmarkPending: {
    color: "red", // Czerwony dla niewykonanych
  },
  taskDescription: {
    fontSize: theme.fonts.body,
    flex: 1,
    color: theme.colors.text,
  },
  taskDone: {
    textDecorationLine: "line-through",
    color: theme.colors.textSecondary,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginBottom: theme.spacing.medium,
  },
  notesContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    padding: theme.spacing.medium,
    minHeight: 100,
    marginBottom: 50,
  },
  notesText: {
    fontSize: theme.fonts.body,
    color: theme.colors.text,
    fontStyle: "italic",
  },
});

export default ReportDetailScreen;
