import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig"; // Sprawdź ścieżkę
import { theme } from "../../theme"; // Sprawdź ścieżkę
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Interfejsy zgodne z nowym ShiftDetailScreen
interface Task {
  description: string;
  isDone: boolean;
}
interface DrinkLog {
  type: string;
  amount: number;
}
interface FoodLog {
  time: string;
  description: string;
}
interface ShiftData {
  id: string;
  patientName: string;
  caregiverId: string;
  start: any; // Timestamp
  end?: any; // Timestamp
  status: string;

  // Nowe struktury
  tasks?: Task[];
  moods?: string[];
  moodNote?: string;
  sleepLogs?: string[];
  intakeLogs?: DrinkLog[];
  foodLogs?: FoodLog[];

  // Stare/Pojedyncze pola
  notes?: string;
  strength?: string;
  cognition?: number;
  toiletUrine?: boolean;
  toiletBowel?: boolean;
  appetite?: "bad" | "normal" | "good";
}

const ReportDetailScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { shiftId } = route.params;
  const [shift, setShift] = useState<ShiftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [caregiverName, setCaregiverName] = useState("Nieznany");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const docRef = doc(db, "shifts", shiftId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as ShiftData;
          setShift(data);

          // Pobierz dane opiekuna
          if (data.caregiverId) {
            const userDoc = await getDoc(doc(db, "users", data.caregiverId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setCaregiverName(userData.name || userData.email || "Nieznany");
            }
          }
        }
      } catch (error) {
        console.error("Błąd pobierania raportu", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [shiftId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!shift) {
    return (
      <View style={styles.center}>
        <Text>Nie znaleziono raportu.</Text>
      </View>
    );
  }

  // Formatowanie dat
  const startDate = shift.start?.toDate();
  const endDate = shift.end?.toDate();
  const dateString = startDate ? startDate.toLocaleDateString("pl-PL") : "-";
  const timeString = startDate
    ? `${startDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })} - ${
        endDate
          ? endDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "?"
      }`
    : "-";

  // Helper do ikon apetytu
  const getAppetiteIcon = (appetite?: string) => {
    switch (appetite) {
      case "good":
        return {
          icon: "emoticon-excited-outline",
          color: "#4CAF50",
          text: "Dobry",
        };
      case "bad":
        return {
          icon: "emoticon-sad-outline",
          color: "#F44336",
          text: "Słaby",
        };
      default:
        return {
          icon: "emoticon-neutral-outline",
          color: "#FF9800",
          text: "Średni",
        };
    }
  };
  const appetiteInfo = getAppetiteIcon(shift.appetite);

  // Obliczanie sumy płynów
  const totalDrinks =
    shift.intakeLogs?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HEADER RAPORTU */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>RAPORT Z WIZYTY</Text>
          <Text style={styles.patientName}>{shift.patientName}</Text>

          <View style={styles.headerRow}>
            <MaterialCommunityIcons
              name="calendar-month"
              size={16}
              color="#eee"
            />
            <Text style={styles.headerText}> {dateString}</Text>
            <View style={styles.dividerVertical} />
            <MaterialCommunityIcons
              name="clock-time-four-outline"
              size={16}
              color="#eee"
            />
            <Text style={styles.headerText}> {timeString}</Text>
          </View>

          <View style={styles.caregiverRow}>
            <MaterialCommunityIcons
              name="account-check-outline"
              size={18}
              color="white"
            />
            <Text style={styles.caregiverText}> Opiekun: {caregiverName}</Text>
          </View>
        </View>

        {/* PODSUMOWANIE FIZJOLOGICZNE (Kafelki) */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons
              name={appetiteInfo.icon as any}
              size={28}
              color={appetiteInfo.color}
            />
            <Text style={styles.statLabel}>Apetyt</Text>
            <Text style={[styles.statValue, { color: appetiteInfo.color }]}>
              {appetiteInfo.text}
            </Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons
              name="water-outline"
              size={28}
              color="#2196F3"
            />
            <Text style={styles.statLabel}>Płyny</Text>
            <Text style={[styles.statValue, { color: "#2196F3" }]}>
              {totalDrinks} szkl.
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={{ flexDirection: "row", gap: 5 }}>
              <MaterialCommunityIcons
                name="water"
                size={20}
                color={shift.toiletUrine ? "#2196F3" : "#ddd"}
              />
              <MaterialCommunityIcons
                name="emoticon-poop"
                size={20}
                color={shift.toiletBowel ? "#795548" : "#ddd"}
              />
            </View>
            <Text style={styles.statLabel}>Toaleta</Text>
            <Text style={styles.statValue}>
              {shift.toiletUrine || shift.toiletBowel ? "Tak" : "Brak"}
            </Text>
          </View>
        </View>

        {/* SEKCJ ZADANIA */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>📋 Wykonane zadania</Text>
          {shift.tasks && shift.tasks.length > 0 ? (
            shift.tasks.map((task, index) => (
              <View key={index} style={styles.taskRow}>
                <MaterialCommunityIcons
                  name={
                    task.isDone
                      ? "checkbox-marked-circle"
                      : "close-circle-outline"
                  }
                  size={22}
                  color={task.isDone ? "#4CAF50" : "#9E9E9E"}
                />
                <Text
                  style={[styles.taskText, !task.isDone && styles.taskTextDim]}
                >
                  {task.description}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Brak zadań w tej wizycie.</Text>
          )}
        </View>

        {/* SEKCJA JEDZENIE I PICIE */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>🍽️ Posiłki i Płyny</Text>

          <Text style={styles.subHeader}>Posiłki:</Text>
          {shift.foodLogs && shift.foodLogs.length > 0 ? (
            shift.foodLogs.map((food, i) => (
              <View key={i} style={styles.logRow}>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeText}>{food.time}</Text>
                </View>
                <Text style={styles.logText}>{food.description}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              Brak zarejestrowanych posiłków.
            </Text>
          )}

          <View style={{ height: 15 }} />
          <Text style={styles.subHeader}>Szczegóły nawodnienia:</Text>
          {shift.intakeLogs && shift.intakeLogs.length > 0 ? (
            shift.intakeLogs.map((drink, i) => (
              <View key={i} style={styles.logRowSimple}>
                <MaterialCommunityIcons
                  name="cup-water"
                  size={16}
                  color="#2196F3"
                />
                <Text style={styles.logText}>
                  <Text style={{ fontWeight: "bold" }}>{drink.type}</Text>:{" "}
                  {drink.amount} szkl.
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Brak szczegółów.</Text>
          )}
        </View>

        {/* SEKCJA DRZEMKI I SEN */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>😴 Odpoczynek</Text>
          {shift.sleepLogs && shift.sleepLogs.length > 0 ? (
            shift.sleepLogs.map((nap, i) => (
              <View key={i} style={styles.logRowSimple}>
                <MaterialCommunityIcons
                  name="bed-clock"
                  size={18}
                  color="#7B1FA2"
                />
                <Text style={styles.logText}>{nap}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Brak drzemek.</Text>
          )}
        </View>

        {/* SEKCJA NASTRÓJ */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>🧠 Nastrój i Zachowanie</Text>

          {/* Tagi */}
          <View style={styles.tagsRow}>
            {shift.moods && shift.moods.length > 0 ? (
              shift.moods.map((m, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{m}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Nie zaznaczono nastroju.</Text>
            )}
          </View>

          {/* Notatka o nastroju */}
          {shift.moodNote ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Notatka o nastroju:</Text>
              <Text style={styles.noteText}>{shift.moodNote}</Text>
            </View>
          ) : null}

          {/* Siła i Kojarzenie */}
          <View style={styles.statsRowDetail}>
            <Text style={styles.detailText}>
              💪 Siła:{" "}
              <Text style={{ fontWeight: "bold" }}>{shift.strength}</Text>
            </Text>
            <Text style={styles.detailText}>
              💡 Kojarzenie:{" "}
              <Text style={{ fontWeight: "bold" }}>{shift.cognition}/10</Text>
            </Text>
          </View>
        </View>

        {/* SEKCJA UWAGI */}
        {shift.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>📝 Dodatkowe uwagi</Text>
            <Text style={styles.mainNoteText}>{shift.notes}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 15, paddingBottom: 40 },

  // HEADER STYLE
  headerCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  headerTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 5,
  },
  patientName: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headerText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  dividerVertical: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginHorizontal: 10,
  },
  caregiverRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  caregiverText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },

  // STATS GRID
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    width: "31%",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 5,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },

  // SECTIONS
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 8,
  },
  subHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
    marginBottom: 8,
  },

  // TASKS
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  taskText: {
    fontSize: 15,
    color: "#333",
    marginLeft: 10,
    flex: 1,
  },
  taskTextDim: {
    color: "#999",
    textDecorationLine: "line-through",
  },

  // LOGS (FOOD, ETC)
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#fafafa",
    padding: 8,
    borderRadius: 8,
  },
  logRowSimple: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  timeBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 10,
  },
  timeText: {
    color: "#1976D2",
    fontSize: 12,
    fontWeight: "bold",
  },
  logText: {
    fontSize: 14,
    color: "#444",
    flex: 1,
  },

  // MOOD
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 15,
  },
  tag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  tagText: {
    color: "#555",
    fontSize: 13,
  },
  noteBox: {
    backgroundColor: "#FFF8E1",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: "#FFC107",
  },
  noteLabel: {
    fontSize: 11,
    color: "#bfa056",
    fontWeight: "bold",
    marginBottom: 2,
  },
  noteText: {
    fontSize: 14,
    color: "#5d4037",
    fontStyle: "italic",
  },
  statsRowDetail: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
  detailText: {
    fontSize: 14,
    color: "#555",
  },

  // GENERAL NOTES
  mainNoteText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },

  emptyText: {
    fontSize: 13,
    color: "#aaa",
    fontStyle: "italic",
  },
});

export default ReportDetailScreen;
