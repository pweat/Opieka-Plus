import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  ScrollView,
} from "react-native";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme";
import { Calendar, LocaleConfig } from "react-native-calendars";

LocaleConfig.locales["pl"] = {
  monthNames: [
    "Styczeń",
    "Luty",
    "Marzec",
    "Kwiecień",
    "Maj",
    "Czerwiec",
    "Lipiec",
    "Sierpień",
    "Wrzesień",
    "Październik",
    "Listopad",
    "Grudzień",
  ],
  monthNamesShort: [
    "Sty.",
    "Lut.",
    "Mar.",
    "Kwi.",
    "Maj",
    "Cze.",
    "Lip.",
    "Sie.",
    "Wrz.",
    "Paź.",
    "Lis.",
    "Gru.",
  ],
  dayNames: [
    "Niedziela",
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota",
  ],
  dayNamesShort: ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"],
  today: "Dzisiaj",
};
LocaleConfig.defaultLocale = "pl";

interface Task {
  description: string;
  isDone: boolean;
}
interface Shift {
  id: string;
  patientName: string;
  caregiverId: string;
  start: Timestamp;
  end?: Timestamp;
  status: string;
  moods?: string[];
  drinkAmount?: number;
  toiletUrine?: boolean;
  toiletBowel?: boolean;
  tasks?: Task[];
  appetite?: string;
  strength?: string;
}
interface CaregiverInfo {
  id: string;
  name: string;
  email: string;
}

const PatientDetailScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { patientId } = route.params;
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [caregiversMap, setCaregiversMap] = useState<{ [key: string]: string }>(
    {}
  );
  const [allShifts, setAllShifts] = useState<Shift[]>([]);

  const [activeTab, setActiveTab] = useState<"dashboard" | "calendar">(
    "dashboard"
  );
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [liveShift, setLiveShift] = useState<Shift | null>(null);

  // Rozbudowane statystyki
  const [dailyStats, setDailyStats] = useState({
    drinks: 0,
    mood: "",
    hasUrine: false,
    hasBowel: false,
    tasksDone: 0,
    tasksTotal: 0,
    lastAppetite: "-",
    lastStrength: "-",
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const patientDoc = await getDoc(doc(db, "patients", patientId));
        if (!patientDoc.exists()) {
          Alert.alert("Błąd", "Nie znaleziono podopiecznego.");
          navigation.goBack();
          return;
        }
        setPatient({ id: patientDoc.id, ...patientDoc.data() });

        const shiftsQuery = query(
          collection(db, "shifts"),
          where("patientId", "==", patientId),
          orderBy("start", "desc")
        );
        const querySnapshot = await getDocs(shiftsQuery);
        const shiftsData = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Shift)
        );
        setAllShifts(shiftsData);

        // --- Logika Dashboardu ---
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];

        const current = shiftsData.find((s) => {
          const start = s.start.toDate();
          const end = s.end?.toDate();
          return (
            s.status === "in_progress" ||
            (end && now >= start && now <= end && s.status !== "completed")
          );
        });
        setLiveShift(current || null);

        // Agregacja danych z dzisiaj
        const todayShifts = shiftsData.filter(
          (s) => s.start.toDate().toISOString().split("T")[0] === todayStr
        );

        let totalDrinks = 0;
        let hasUrine = false;
        let hasBowel = false;
        let tDone = 0;
        let tTotal = 0;
        let lastApp = "-";
        let lastStr = "-";
        const moodsSet = new Set<string>();

        // Sortujemy od najstarszej do najnowszej dzisiaj, żeby wziąć ostatni wpisany stan
        const todayShiftsSorted = [...todayShifts].reverse();

        todayShiftsSorted.forEach((s) => {
          if (s.drinkAmount) totalDrinks += s.drinkAmount;
          if (s.toiletUrine) hasUrine = true;
          if (s.toiletBowel) hasBowel = true;
          if (s.moods) s.moods.forEach((m) => moodsSet.add(m));

          if (s.tasks) {
            tTotal += s.tasks.length;
            tDone += s.tasks.filter((t) => t.isDone).length;
          }
          if (s.appetite) lastApp = s.appetite; // Nadpisuje, więc zostanie ostatni
          if (s.strength) lastStr = s.strength;
        });

        setDailyStats({
          drinks: totalDrinks,
          mood:
            Array.from(moodsSet).slice(0, 2).join(", ") +
            (moodsSet.size > 2 ? "..." : ""),
          hasUrine,
          hasBowel,
          tasksDone: tDone,
          tasksTotal: tTotal,
          lastAppetite:
            lastApp === "good"
              ? "😋"
              : lastApp === "bad"
              ? "🤢"
              : lastApp === "normal"
              ? "😐"
              : "-",
          lastStrength: lastStr,
        });
        // -------------------------

        const uniqueIds = new Set<string>();
        shiftsData.forEach((s) => {
          if (s.caregiverId) uniqueIds.add(s.caregiverId);
        });
        if (patientDoc.data().caregiverIds) {
          patientDoc
            .data()
            .caregiverIds.forEach((id: string) => uniqueIds.add(id));
        }

        const caregiversData = await Promise.all(
          Array.from(uniqueIds).map(async (id) => {
            const u = await getDoc(doc(db, "users", id));
            return u.exists()
              ? ({ id: u.id, ...u.data() } as CaregiverInfo)
              : { id, name: "Usunięty", email: "" };
          })
        );
        const map: { [key: string]: string } = {};
        caregiversData.forEach(
          (c) => (map[c.id] = c.name || c.email || "Bez nazwy")
        );
        setCaregiversMap(map);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    };

    const unsubscribe = navigation.addListener("focus", fetchData);
    return unsubscribe;
  }, [patientId, navigation]);

  if (loading)
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  if (!patient)
    return (
      <View style={styles.container}>
        <Text>Brak danych.</Text>
      </View>
    );

  const TabSelector = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === "dashboard" && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab("dashboard")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "dashboard" && styles.tabTextActive,
          ]}
        >
          🏠 Pulpit
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === "calendar" && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab("calendar")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "calendar" && styles.tabTextActive,
          ]}
        >
          📅 Harmonogram
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderDashboard = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Profil (bez ołówka, bo przenieśliśmy go na dół) */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {patient.photoURL ? (
            <Image source={{ uri: patient.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {patient.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{patient.name}</Text>
        <Text style={styles.description}>{patient.description}</Text>
      </View>

      {/* Statusy */}
      {liveShift && (
        <View style={styles.liveCard}>
          <Text style={styles.liveTitle}>🔴 TERAZ U PODOPIECZNEGO</Text>
          <Text style={styles.liveText}>
            Opiekun:{" "}
            <Text style={{ fontWeight: "bold" }}>
              {caregiversMap[liveShift.caregiverId] || "Nieznany"}
            </Text>
          </Text>
          <Text style={styles.liveSubText}>
            Planowo do:{" "}
            {liveShift.end
              ?.toDate()
              .toLocaleTimeString("pl-PL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
          </Text>
        </View>
      )}

      {/* Rozbudowane Podsumowanie */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          📊 Dzisiaj ({new Date().toLocaleDateString("pl-PL")})
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Zadania</Text>
            <Text style={styles.statValue}>
              {dailyStats.tasksDone}/{dailyStats.tasksTotal}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Wypito</Text>
            <Text style={styles.statValue}>{dailyStats.drinks} szkl.</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Toaleta</Text>
            <Text style={styles.statValue}>
              {dailyStats.hasUrine || dailyStats.hasBowel ? "✅" : "-"}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Apetyt</Text>
            <Text style={styles.statValue}>{dailyStats.lastAppetite}</Text>
          </View>
        </View>

        <View style={styles.moodRow}>
          <Text style={styles.statLabel}>
            Siła:{" "}
            <Text style={{ color: theme.colors.text, fontWeight: "bold" }}>
              {dailyStats.lastStrength}
            </Text>
          </Text>
          <Text style={styles.statLabel}>
            Nastrój:{" "}
            <Text style={{ color: theme.colors.text, fontWeight: "bold" }}>
              {dailyStats.mood || "-"}
            </Text>
          </Text>
        </View>
      </View>

      {/* Siatka 4 Przycisków */}
      <Text style={styles.sectionLabel}>Szybkie Akcje</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            navigation.navigate("ScheduleVisit", {
              patientId: patient.id,
              patientName: patient.name,
            })
          }
        >
          <Text style={styles.actionBtnIcon}>📅</Text>
          <Text style={styles.actionBtnText}>Zaplanuj</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            navigation.navigate("ManageCaregivers", { patientId: patient.id })
          }
        >
          <Text style={styles.actionBtnIcon}>👥</Text>
          <Text style={styles.actionBtnText}>Opiekunowie</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            navigation.navigate("MedicalHistory", { patientId: patient.id })
          }
        >
          <Text style={styles.actionBtnIcon}>🗂️</Text>
          <Text style={styles.actionBtnText}>Kartoteka</Text>
        </TouchableOpacity>

        {/* 4. PRZYCISK - EDYCJA PROFILU */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            navigation.navigate("EditPatient", { patientId: patient.id })
          }
        >
          <Text style={styles.actionBtnIcon}>⚙️</Text>
          <Text style={styles.actionBtnText}>Edytuj Profil</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderCalendarView = () => {
    const markedDates: any = {};
    allShifts.forEach((shift) => {
      const dateKey = shift.start.toDate().toISOString().split("T")[0];
      markedDates[dateKey] = { marked: true, dotColor: theme.colors.primary };
    });
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: theme.colors.primary,
    };

    const selectedDateShifts = allShifts.filter(
      (shift) =>
        shift.start.toDate().toISOString().split("T")[0] === selectedDate
    );
    selectedDateShifts.sort((a, b) => a.start.toMillis() - b.start.toMillis());

    return (
      <View style={{ flex: 1 }}>
        <Calendar
          current={selectedDate}
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            todayTextColor: theme.colors.primary,
            arrowColor: theme.colors.primary,
            dotColor: theme.colors.primary,
            selectedDayBackgroundColor: theme.colors.primary,
          }}
        />
        <Text style={styles.dateHeader}>Wizyty w dniu: {selectedDate}</Text>

        <FlatList
          data={selectedDateShifts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.shiftCard}
              onPress={() => {
                if (item.status === "completed") {
                  navigation.navigate("ReportDetail", { shiftId: item.id });
                } else {
                  navigation.navigate("EditVisit", { shiftId: item.id });
                }
              }}
            >
              <View>
                <Text style={styles.cardTitle}>
                  {item.start
                    .toDate()
                    .toLocaleTimeString("pl-PL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  -
                  {item.end
                    ? item.end
                        .toDate()
                        .toLocaleTimeString("pl-PL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                    : ""}
                </Text>
                <Text style={styles.statusText}>
                  {item.status === "completed"
                    ? "✅ Zakończona"
                    : "🟡 Zaplanowana"}
                </Text>
              </View>
              <View style={styles.caregiverBadge}>
                <Text style={styles.caregiverText}>
                  👤 {caregiversMap[item.caregiverId] || "Nieznany"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Brak wizyt w wybranym dniu.</Text>
          }
          contentContainerStyle={{ paddingBottom: 50 }}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TabSelector />
      <View style={styles.contentContainer}>
        {activeTab === "dashboard" ? renderDashboard() : renderCalendarView()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { justifyContent: "center", alignItems: "center" },
  contentContainer: { flex: 1 },
  scrollContent: { padding: 20 },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    elevation: 4,
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabButtonActive: { borderBottomColor: theme.colors.primary },
  tabText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: "bold",
  },
  tabTextActive: { color: theme.colors.primary },

  profileHeader: { alignItems: "center", marginBottom: 20 },
  avatarContainer: { marginBottom: 10, position: "relative" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#eee",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "white", fontSize: 40, fontWeight: "bold" },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginTop: 5,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },

  liveCard: {
    width: "100%",
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#4CAF50",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  liveTitle: {
    color: "#d32f2f",
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 5,
  },
  liveText: { fontSize: 16, color: "#333" },
  liveSubText: { fontSize: 12, color: "#666", marginTop: 2 },

  // SUMMARY STYLES
  summaryCard: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 10,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statItem: {
    width: "48%",
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginTop: 2,
  },
  moodRow: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-around",
  },

  sectionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 10,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionBtn: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 15,
    elevation: 2,
  },
  actionBtnIcon: { fontSize: 30, marginBottom: 5 },
  actionBtnText: { fontWeight: "bold", color: theme.colors.text },

  dateHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    padding: 15,
    backgroundColor: "#f0f0f0",
  },
  shiftCard: {
    backgroundColor: theme.colors.card,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 1,
  },
  cardTitle: { fontWeight: "bold", fontSize: 16, color: theme.colors.text },
  statusText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  caregiverBadge: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  caregiverText: { fontSize: 12, color: theme.colors.text, fontWeight: "bold" },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
  },
});

export default PatientDetailScreen;
