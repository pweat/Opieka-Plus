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
  SafeAreaView,
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
import { db, auth } from "../../firebaseConfig";
import { theme } from "../../theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

interface Shift {
  id: string;
  patientName: string;
  caregiverId: string;
  start: Timestamp;
  end?: Timestamp;
  status: string;
  moods?: string[];
  moodNote?: string;
  drinkAmount?: number;
  toiletUrine?: boolean;
  toiletBowel?: boolean;
  tasks?: any[];
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
  const [dailyStats, setDailyStats] = useState({
    drinks: 0,
    mood: "",
    hasUrine: false,
    hasBowel: false,
    hasData: false,
  });

  const [userRole, setUserRole] = useState<string | null>(null);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          }
        }

        const patientDoc = await getDoc(doc(db, "patients", patientId));
        if (!patientDoc.exists()) {
          Alert.alert("Błąd", "Nie znaleziono podopiecznego.");
          navigation.goBack();
          return;
        }
        const pData = patientDoc.data();
        setPatient({ id: patientDoc.id, ...pData });

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

        const todayShifts = shiftsData.filter(
          (s) => s.start.toDate().toISOString().split("T")[0] === todayStr
        );

        let totalDrinks = 0;
        let hasUrine = false;
        let hasBowel = false;
        const moodsSet = new Set<string>();
        let dataExists = false;

        todayShifts.forEach((s) => {
          if (s.status === "completed" || s.status === "in_progress")
            dataExists = true;
          if (s.drinkAmount) totalDrinks += s.drinkAmount;
          if (s.toiletUrine) hasUrine = true;
          if (s.toiletBowel) hasBowel = true;
          if (s.moods) s.moods.forEach((m) => moodsSet.add(m));
        });

        setDailyStats({
          drinks: totalDrinks,
          mood:
            Array.from(moodsSet).slice(0, 2).join(", ") +
            (moodsSet.size > 2 ? "..." : ""),
          hasUrine,
          hasBowel,
          hasData: dataExists,
        });

        const uniqueIds = new Set<string>();
        shiftsData.forEach((s) => {
          if (s.caregiverId) uniqueIds.add(s.caregiverId);
        });
        if (pData.caregiverIds) {
          pData.caregiverIds.forEach((id: string) => uniqueIds.add(id));
        }

        if (uniqueIds.size > 0) {
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
        }
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
  if (!patient) return null;

  const isOwner = userRole === "opiekun_glowny";
  const hasCaregivers = patient.caregiverIds && patient.caregiverIds.length > 0;

  // =====================================================================
  // WIDOK OPIEKUNA
  // =====================================================================
  if (!isOwner) {
    const myNextShift = allShifts.find(
      (s) =>
        s.caregiverId === currentUserId &&
        s.status !== "completed" &&
        s.start.toDate() >= new Date()
    );
    const futureShifts = allShifts
      .filter((s) => s.start.toDate() >= new Date() && s.status !== "completed")
      .reverse();

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* KARTA PACJENTA */}
        <View style={styles.simpleProfileCard}>
          <View style={styles.avatarContainer}>
            {patient.photoURL ? (
              <Image
                source={{ uri: patient.photoURL }}
                style={styles.avatarBig}
              />
            ) : (
              <View style={styles.avatarPlaceholderBig}>
                <Text style={styles.avatarTextBig}>
                  {patient.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.nameBig}>{patient.name}</Text>
          <Text style={styles.descSimple}>{patient.description}</Text>

          <TouchableOpacity
            style={styles.medBtn}
            onPress={() =>
              navigation.navigate("MedicalHistory", { patientId: patient.id })
            }
          >
            <MaterialCommunityIcons name="pill" size={20} color="white" />
            <Text style={styles.medBtnText}>KARTOTEKA MEDYCZNA</Text>
          </TouchableOpacity>
        </View>

        {/* NAJBLIŻSZA WIZYTA - TERAZ CAŁA KLIKALNA */}
        {myNextShift && (
          <TouchableOpacity
            style={styles.nextShiftCard}
            onPress={() =>
              navigation.navigate("ShiftDetail", { shiftId: myNextShift.id })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.sectionTitleSmall}>
              TWOJA NAJBLIŻSZA WIZYTA
            </Text>
            <View style={styles.nextShiftRow}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={32}
                color={theme.colors.primary}
              />
              <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={styles.nextShiftDate}>
                  {myNextShift.start
                    .toDate()
                    .toLocaleDateString("pl-PL", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                </Text>
                <Text style={styles.nextShiftTime}>
                  {myNextShift.start
                    .toDate()
                    .toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                  -{" "}
                  {myNextShift.end
                    ?.toDate()
                    .toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                </Text>
              </View>
              {/* Strzałka wskazująca, że można kliknąć */}
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#ccc"
              />
            </View>

            <View style={styles.openShiftBadge}>
              <Text style={styles.openShiftBadgeText}>
                Kliknij, aby otworzyć
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* LISTA WSZYSTKICH WIZYT */}
        <Text style={styles.listHeaderSimple}>Nadchodzący grafik</Text>
        {futureShifts.length > 0 ? (
          futureShifts.map((s) => (
            <View key={s.id} style={styles.simpleShiftRow}>
              <View style={styles.dateBadge}>
                <Text style={styles.dayNum}>{s.start.toDate().getDate()}</Text>
                <Text style={styles.monStr}>
                  {s.start.toDate().toLocaleString("pl-PL", { month: "short" })}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.simpleShiftTime}>
                  {s.start
                    .toDate()
                    .toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                  -{" "}
                  {s.end
                    ?.toDate()
                    .toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                </Text>
                <Text style={styles.simpleShiftCaregiver}>
                  {s.caregiverId === currentUserId
                    ? "👤 Ty"
                    : `👤 ${caregiversMap[s.caregiverId] || "Inny opiekun"}`}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Brak innych wizyt w grafiku.</Text>
        )}
      </ScrollView>
    );
  }

  // =====================================================================
  // WIDOK OPIEKUNA GŁÓWNEGO
  // =====================================================================

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
          {isOwner && (
            <TouchableOpacity
              style={styles.editIconBadge}
              onPress={() =>
                navigation.navigate("EditPatient", { patientId: patient.id })
              }
            >
              <MaterialCommunityIcons
                name="pencil"
                size={16}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.name}>{patient.name}</Text>
        <Text style={styles.description}>{patient.description}</Text>
      </View>

      {!hasCaregivers && isOwner ? (
        <View style={styles.onboardingContainer}>
          <Text style={styles.onboardingTitle}>👋 Konfiguracja profilu</Text>
          <Text style={styles.onboardingSub}>
            To jest nowy profil. Wykonaj te kroki, aby rozpocząć opiekę:
          </Text>
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Zaproś Opiekuna</Text>
              <Text style={styles.stepDesc}>
                Dodaj osobę, która będzie pomagać.
              </Text>
              <TouchableOpacity
                style={styles.stepActionBtn}
                onPress={() =>
                  navigation.navigate("ManageCaregivers", {
                    patientId: patient.id,
                  })
                }
              >
                <Text style={styles.stepBtnText}>Dodaj Opiekuna</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={16}
                  color="white"
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.stepCard, { opacity: 0.8 }]}>
            <View style={[styles.stepNumber, { backgroundColor: "#ccc" }]}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Zaplanuj pierwszą wizytę</Text>
              <Text style={styles.stepDesc}>
                Będziesz mógł to zrobić po dodaniu opiekuna.
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <>
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
              <TouchableOpacity
                style={styles.liveBtn}
                onPress={() =>
                  navigation.navigate("ShiftDetail", { shiftId: liveShift.id })
                }
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Otwórz wizytę
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              📊 Dzisiaj ({new Date().toLocaleDateString("pl-PL")})
            </Text>
            {dailyStats.hasData ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryItem}>
                    💧 {dailyStats.drinks} szkl.
                  </Text>
                  <Text style={styles.summaryItem}>
                    🚽{" "}
                    {dailyStats.hasUrine || dailyStats.hasBowel ? "Była" : "-"}
                  </Text>
                </View>
                <Text style={styles.summaryMood}>
                  🧠 Nastrój: {dailyStats.mood || "Brak danych"}
                </Text>
              </>
            ) : (
              <View style={styles.tutorialBox}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={24}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.tutorialText}>Brak danych z dzisiaj.</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionLabel}>Akcje</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                navigation.navigate("MedicalHistory", { patientId: patient.id })
              }
            >
              <View style={[styles.iconCircle, { backgroundColor: "#FFF3E0" }]}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={24}
                  color="#F57C00"
                />
              </View>
              <Text style={styles.actionBtnText}>Kartoteka</Text>
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  navigation.navigate("ScheduleVisit", {
                    patientId: patient.id,
                    patientName: patient.name,
                  })
                }
              >
                <View
                  style={[styles.iconCircle, { backgroundColor: "#E3F2FD" }]}
                >
                  <MaterialCommunityIcons
                    name="calendar-plus"
                    size={24}
                    color="#1976D2"
                  />
                </View>
                <Text style={styles.actionBtnText}>Zaplanuj</Text>
              </TouchableOpacity>
            )}

            {isOwner && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  navigation.navigate("ManageCaregivers", {
                    patientId: patient.id,
                  })
                }
              >
                <View
                  style={[styles.iconCircle, { backgroundColor: "#E8F5E9" }]}
                >
                  <MaterialCommunityIcons
                    name="account-group"
                    size={24}
                    color="#388E3C"
                  />
                </View>
                <Text style={styles.actionBtnText}>Opiekunowie</Text>
              </TouchableOpacity>
            )}

            {isOwner && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  navigation.navigate("EditPatient", { patientId: patient.id })
                }
              >
                <View
                  style={[styles.iconCircle, { backgroundColor: "#F3E5F5" }]}
                >
                  <MaterialCommunityIcons
                    name="cog-outline"
                    size={24}
                    color="#7B1FA2"
                  />
                </View>
                <Text style={styles.actionBtnText}>Edytuj Profil</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
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
          firstDay={1}
          theme={{
            todayTextColor: theme.colors.primary,
            arrowColor: theme.colors.primary,
            dotColor: theme.colors.primary,
            selectedDayBackgroundColor: theme.colors.primary,
          }}
        />
        <View style={styles.listHeader}>
          <Text style={styles.dateHeader}>Wizyty: {selectedDate}</Text>
        </View>
        <FlatList
          data={selectedDateShifts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 50 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Brak wizyt w wybranym dniu.</Text>
          }
          renderItem={({ item }) => {
            const isCompleted = item.status === "completed";
            return (
              <TouchableOpacity
                style={[
                  styles.shiftCard,
                  isCompleted && styles.shiftCardCompleted,
                ]}
                onPress={() => {
                  if (isCompleted)
                    navigation.navigate("ReportDetail", { shiftId: item.id });
                  else navigation.navigate("ShiftDetail", { shiftId: item.id });
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {item.start
                      .toDate()
                      .toLocaleTimeString("pl-PL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    {item.end
                      ? ` - ${item.end
                          .toDate()
                          .toLocaleTimeString("pl-PL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                      : ""}
                  </Text>
                  <Text style={styles.statusText}>
                    {isCompleted ? "✅ Raport dostępny" : "🟡 Zaplanowana"}
                  </Text>
                  {isCompleted && item.moodNote && (
                    <Text style={styles.moodNote} numberOfLines={1}>
                      🧠 {item.moodNote}
                    </Text>
                  )}
                </View>
                <View style={styles.caregiverBadge}>
                  <Text style={styles.caregiverText}>
                    👤 {caregiversMap[item.caregiverId] || "Opiekun"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {isOwner && <TabSelector />}
      <View style={styles.contentContainer}>
        {!isOwner
          ? renderDashboard()
          : activeTab === "dashboard"
          ? renderDashboard()
          : renderCalendarView()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { justifyContent: "center", alignItems: "center" },
  contentContainer: { flex: 1 },
  scrollContent: { padding: 20 },

  // STYLES FOR CAREGIVER VIEW (SIMPLE)
  simpleProfileCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 3,
    marginBottom: 25,
  },
  avatarBig: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  avatarPlaceholderBig: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarTextBig: { fontSize: 40, color: "white", fontWeight: "bold" },
  nameBig: { fontSize: 24, fontWeight: "bold", color: "#333", marginBottom: 5 },
  descSimple: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  medBtn: {
    flexDirection: "row",
    backgroundColor: "#FF9800",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    gap: 8,
    elevation: 2,
  },
  medBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },

  nextShiftCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 25,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: theme.colors.primary,
  },
  sectionTitleSmall: {
    fontSize: 12,
    color: "#888",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  nextShiftRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  nextShiftDate: { fontSize: 18, fontWeight: "bold", color: "#333" },
  nextShiftTime: { fontSize: 16, color: "#555", marginTop: 2 },
  openShiftBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  openShiftBadgeText: { color: "white", fontSize: 12, fontWeight: "bold" },

  listHeaderSimple: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  simpleShiftRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  dateBadge: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 50,
  },
  dayNum: { fontSize: 16, fontWeight: "bold", color: "#333" },
  monStr: { fontSize: 12, color: "#666", textTransform: "uppercase" },
  simpleShiftTime: { fontSize: 15, fontWeight: "600", color: "#333" },
  simpleShiftCaregiver: { fontSize: 13, color: "#666", marginTop: 2 },

  // OWNER STYLES
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
  editIconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "white",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    borderWidth: 2,
    borderColor: "#f5f7fa",
  },
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
  onboardingContainer: { marginTop: 10 },
  onboardingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
    textAlign: "center",
  },
  onboardingSub: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  stepCard: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    marginTop: 2,
  },
  stepNumText: { color: "white", fontWeight: "bold" },
  stepTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  stepDesc: { fontSize: 13, color: "#666", marginBottom: 10, lineHeight: 18 },
  stepActionBtn: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 5,
  },
  stepBtnText: { color: "white", fontWeight: "bold", fontSize: 13 },
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
  liveBtn: {
    marginTop: 10,
    backgroundColor: "#4CAF50",
    padding: 8,
    borderRadius: 5,
    alignItems: "center",
  },
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
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  summaryItem: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  summaryMood: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
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
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: theme.colors.text },
  listHeader: {
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  dateHeader: { fontSize: 16, fontWeight: "bold", color: theme.colors.text },
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
    marginTop: 10,
  },
  shiftCardCompleted: { borderLeftWidth: 4, borderLeftColor: "#4CAF50" },
  cardTitle: { fontWeight: "bold", fontSize: 16, color: theme.colors.text },
  statusText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  moodNote: { fontSize: 12, color: "#666", fontStyle: "italic", marginTop: 4 },
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
  tutorialBox: { flexDirection: "row", alignItems: "center", padding: 5 },
  tutorialText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 18,
  },
});

export default PatientDetailScreen;
