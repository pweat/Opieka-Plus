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
interface DrinkLog {
  type: string;
  amount: number;
}

// Pełny interfejs zgodny z tym w ShiftDetail
interface ShiftDetails {
  id: string;
  patientName: string;
  tasks: Task[];
  notes?: string;
  status?: string;
  start: Timestamp;

  moods?: string[];
  strength?: string;
  cognition?: number;
  energy?: "low" | "medium" | "high"; // Zachowane dla kompatybilności
  toiletUrine?: boolean;
  toiletBowel?: boolean;
  sleepLogs?: string[];
  intakeLogs?: DrinkLog[];
  foodContent?: string;
  appetite?: "bad" | "normal" | "good";
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
            moods: data.moods || [],
            // Poprawka błędu TS: upewniamy się, że wszystkie pola są mapowane
            energy: data.energy,
            strength: data.strength,
            cognition: data.cognition,
            toiletUrine: data.toiletUrine,
            toiletBowel: data.toiletBowel,
            sleepLogs: data.sleepLogs,
            intakeLogs: data.intakeLogs,
            foodContent: data.foodContent,
            appetite: data.appetite,
            notes: data.notes,
            start: data.start,
            status: data.status,
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

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        style={styles.loader}
        color={theme.colors.primary}
      />
    );
  if (!shift) return <Text>Błąd danych.</Text>;

  const getAppetiteText = (app?: string) => {
    if (app === "good") return "😋 Dobry";
    if (app === "bad") return "🤢 Słaby";
    return "😐 Średni";
  };

  // Obliczanie sumy płynów
  const totalDrinks =
    shift.intakeLogs?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.headerName}>{shift.patientName}</Text>
        <Text style={styles.headerDate}>
          {shift.start.toDate().toLocaleDateString("pl-PL")} |{" "}
          {shift.start
            .toDate()
            .toLocaleTimeString("pl-PL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
        </Text>
        <Text
          style={[
            styles.statusBadge,
            shift.status === "completed"
              ? { color: "green" }
              : { color: "orange" },
          ]}
        >
          {shift.status === "completed"
            ? "✅ Wizyta Zakończona"
            : "🟡 W toku / Zaplanowana"}
        </Text>
      </View>

      {/* 1. ZADANIA */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Zadania</Text>
        {shift.tasks.length > 0 ? (
          shift.tasks.map((t, i) => (
            <View key={i} style={styles.row}>
              <Text style={{ fontSize: 18, marginRight: 10 }}>
                {t.isDone ? "✅" : "❌"}
              </Text>
              <Text
                style={[
                  styles.text,
                  t.isDone && { color: theme.colors.textSecondary },
                ]}
              >
                {t.description}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Brak zadań.</Text>
        )}
      </View>

      {/* 2. STAN FIZYCZNY */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧠 Stan ogólny</Text>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Siła:</Text>
            <Text style={styles.value}>{shift.strength || "-"}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Kojarzenie:</Text>
            <Text style={styles.value}>
              {shift.cognition ? `${shift.cognition}/10` : "-"}
            </Text>
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 10 }]}>Nastrój:</Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 5,
            marginTop: 5,
          }}
        >
          {shift.moods && shift.moods.length > 0 ? (
            shift.moods.map((m) => (
              <View key={m} style={styles.tag}>
                <Text style={styles.tagText}>{m}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.text}>-</Text>
          )}
        </View>
      </View>

      {/* 3. FIZJOLOGIA I SEN */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚽 Fizjologia i Sen</Text>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Mocz (Siku):</Text>
            <Text style={{ fontSize: 24 }}>
              {shift.toiletUrine ? "✅" : "⛔"}
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Kał (Kupa):</Text>
            <Text style={{ fontSize: 24 }}>
              {shift.toiletBowel ? "✅" : "⛔"}
            </Text>
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 10 }]}>Drzemki:</Text>
        {shift.sleepLogs && shift.sleepLogs.length > 0 ? (
          shift.sleepLogs.map((s, i) => (
            <Text key={i} style={styles.listText}>
              😴 {s}
            </Text>
          ))
        ) : (
          <Text style={styles.empty}>Brak drzemek</Text>
        )}
      </View>

      {/* 4. JEDZENIE I PICIE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🍽️ Posiłki i Nawodnienie</Text>

        <View style={styles.rowBetween}>
          <Text style={styles.label}>Wypito łącznie:</Text>
          <Text style={styles.value}>{totalDrinks} szklanek</Text>
        </View>

        <View style={{ marginBottom: 10 }}>
          {shift.intakeLogs &&
            shift.intakeLogs.map((log, i) => (
              <Text key={i} style={styles.listText}>
                🔹 {log.type}: {log.amount} szkl.
              </Text>
            ))}
        </View>

        <View style={styles.grid}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Apetyt:</Text>
            <Text style={styles.value}>{getAppetiteText(shift.appetite)}</Text>
          </View>
        </View>

        {shift.foodContent ? (
          <View
            style={{
              marginTop: 10,
              borderTopWidth: 1,
              borderColor: "#eee",
              paddingTop: 10,
            }}
          >
            <Text style={styles.label}>Co zjedzono:</Text>
            <Text style={styles.text}>{shift.foodContent}</Text>
          </View>
        ) : null}
      </View>

      {/* 5. NOTATKI */}
      <View style={[styles.section, { marginBottom: 50 }]}>
        <Text style={styles.sectionTitle}>📝 Notatki dodatkowe</Text>
        <Text style={[styles.text, { fontStyle: "italic" }]}>
          {shift.notes || "Brak notatek."}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 15 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    elevation: 2,
  },
  headerName: { fontSize: 22, fontWeight: "bold", color: theme.colors.text },
  headerDate: { color: theme.colors.textSecondary, marginTop: 5 },
  statusBadge: { fontWeight: "bold", marginTop: 5 },

  section: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    paddingBottom: 5,
  },

  row: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  grid: { flexDirection: "row", justifyContent: "space-between" },
  gridItem: { flex: 1, alignItems: "center" },

  label: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: { fontSize: 18, fontWeight: "bold", color: theme.colors.text },
  text: { fontSize: 15, color: theme.colors.text },
  listText: {
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 2,
    marginLeft: 5,
  },
  empty: { color: "#999", fontStyle: "italic" },

  tag: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagText: { color: "white", fontSize: 12, fontWeight: "bold" },
});

export default ReportDetailScreen;
