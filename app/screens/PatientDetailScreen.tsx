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

  // Zakładki dla Szefa
  const [activeTab, setActiveTab] = useState<"dashboard" | "calendar">(
    "dashboard"
  );
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Dashboard stats
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

        // Pobieranie wizyt
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

        // Statystyki
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

        // Opiekunowie
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
  if (!patient)
    return (
      <View style={styles.container}>
        <Text>Brak danych.</Text>
      </View>
    );

  const isOwner = userRole === "opiekun_glowny";

  // === POMOCNIK: LOGIKA STATUSU NAGŁÓWKA ===
  const getSmartHeaderStatus = (shift: Shift) => {
    const now = new Date();
    const start = shift.start.toDate();
    const end = shift.end?.toDate() || new Date();
    const isToday = start.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = start.toDateString() === tomorrow.toDateString();

    if (shift.status === "in_progress")
      return {
        label: "WIZYTA W TOKU",
        color: "#2E7D32",
        bg: "#E8F5E9",
        icon: "progress-clock",
        active: true,
      };
    if (now > end && shift.status !== "completed")
      return {
        label: "ZALEGŁA / DO UZUPEŁNIENIA",
        color: "#E65100",
        bg: "#FFF3E0",
        icon: "alert-circle-outline",
        active: true,
      };
    if (now >= start && now <= end)
      return {
        label: "TERAZ",
        color: "#1565C0",
        bg: "#E3F2FD",
        icon: "clock-alert-outline",
        active: true,
      };
    if (isToday)
      return {
        label: "NAJBLIŻSZA: DZISIAJ",
        color: "#0277BD",
        bg: "#E1F5FE",
        icon: "calendar-today",
        active: false,
      };
    if (isTomorrow)
      return {
        label: "JUTRO",
        color: "#555",
        bg: "#F5F5F5",
        icon: "calendar-arrow-right",
        active: false,
      };
    return {
      label: "NADCHODZĄCA",
      color: "#555",
      bg: "#FAFAFA",
      icon: "calendar-blank",
      active: false,
    };
  };

  // =====================================================================
  // 1. WIDOK OPIEKUNKI
  // =====================================================================
  const renderCaregiverView = () => {
    const shiftsAsc = [...allShifts].reverse();
    const myNextShift = shiftsAsc.find(
      (s) => s.caregiverId === currentUserId && s.status !== "completed"
    );
    const futureShifts = shiftsAsc.filter(
      (s) =>
        s.id !== myNextShift?.id &&
        s.start.toDate() > new Date() &&
        s.status !== "completed"
    );

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
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
          <View style={styles.divider} />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons
              name="shield-check"
              size={20}
              color="green"
              style={{ marginRight: 5 }}
            />
            <Text style={{ color: "green", fontWeight: "600" }}>
              Jesteś w zespole opiekunów
            </Text>
          </View>
        </View>

        {myNextShift &&
          (() => {
            const status = getSmartHeaderStatus(myNextShift);
            return (
              <TouchableOpacity
                style={[
                  styles.nextShiftCard,
                  { borderLeftColor: status.color, backgroundColor: status.bg },
                ]}
                onPress={() =>
                  navigation.navigate("ShiftDetail", {
                    shiftId: myNextShift.id,
                  })
                }
                activeOpacity={0.9}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialCommunityIcons
                      name={status.icon as any}
                      size={24}
                      color={status.color}
                    />
                    <Text
                      style={[
                        styles.heroStatusTitle,
                        { color: status.color, marginLeft: 5 },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardTitle}>{myNextShift.patientName}</Text>
                <Text style={styles.cardTimeBig}>
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
                <Text style={styles.cardDateBig}>
                  {myNextShift.start
                    .toDate()
                    .toLocaleDateString("pl-PL", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                </Text>
                <View
                  style={[styles.openBtn, { backgroundColor: status.color }]}
                >
                  <Text style={styles.openBtnText}>OTWÓRZ</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={18}
                    color="white"
                  />
                </View>
              </TouchableOpacity>
            );
          })()}

        <Text style={styles.listHeaderSimple}>Nadchodzący grafik</Text>
        {futureShifts.length > 0 ? (
          futureShifts.slice(0, 5).map((s) => (
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
  };

  // =====================================================================
  // 2. WIDOK SZEFA - PULPIT
  // =====================================================================
  const renderOwnerDashboard = () => (
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
        </View>
        <Text style={styles.name}>{patient.name}</Text>
        <Text style={styles.description}>{patient.description}</Text>
      </View>

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
                🚽 {dailyStats.hasUrine || dailyStats.hasBowel ? "Była" : "-"}
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
            navigation.navigate("ScheduleVisit", {
              patientId: patient.id,
              patientName: patient.name,
            })
          }
        >
          <View style={[styles.iconCircle, { backgroundColor: "#E3F2FD" }]}>
            <MaterialCommunityIcons
              name="calendar-plus"
              size={24}
              color="#1976D2"
            />
          </View>
          <Text style={styles.actionBtnText}>Zaplanuj</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            navigation.navigate("ManageCaregivers", { patientId: patient.id })
          }
        >
          <View style={[styles.iconCircle, { backgroundColor: "#E8F5E9" }]}>
            <MaterialCommunityIcons
              name="account-group"
              size={24}
              color="#388E3C"
            />
          </View>
          <Text style={styles.actionBtnText}>Opiekunowie</Text>
        </TouchableOpacity>
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
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            navigation.navigate("EditPatient", { patientId: patient.id })
          }
        >
          <View style={[styles.iconCircle, { backgroundColor: "#F3E5F5" }]}>
            <MaterialCommunityIcons
              name="cog-outline"
              size={24}
              color="#7B1FA2"
            />
          </View>
          <Text style={styles.actionBtnText}>Edytuj Profil</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // =====================================================================
  // 3. WIDOK SZEFA - KALENDARZ
  // =====================================================================
  const renderOwnerCalendar = () => {
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
                  else navigation.navigate("EditVisit", { shiftId: item.id });
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

  return (
    <SafeAreaView style={styles.container}>
      {/* GŁÓWNY RETURN - LOGIKA PRZEŁĄCZANIA WIDOKÓW */}
      {isOwner ? (
        <>
          <TabSelector />
          <View style={styles.contentContainer}>
            {activeTab === "dashboard"
              ? renderOwnerDashboard()
              : renderOwnerCalendar()}
          </View>
        </>
      ) : (
        renderCaregiverView()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { justifyContent: "center", alignItems: "center" },
  contentContainer: { flex: 1 },
  scrollContent: { padding: 20 },

  // CAREGIVER STYLES
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
    padding: 20,
    marginBottom: 25,
    elevation: 4,
    borderLeftWidth: 6,
    borderLeftColor: theme.colors.primary,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionTitleSmall: {
    fontSize: 13,
    color: "#555",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 1,
  },
  nextShiftRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  nextShiftDate: { fontSize: 18, fontWeight: "bold", color: "#333" },
  nextShiftTime: { fontSize: 16, color: "#555", marginTop: 2 },
  heroStatusTitle: { fontWeight: "bold", fontSize: 14 },

  openBtn: {
    marginTop: 15,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  openBtnText: { color: "white", fontWeight: "bold", letterSpacing: 1 },
  openShiftBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  openShiftBadgeText: { color: "#555", fontSize: 12, fontWeight: "600" },

  cardTimeBig: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginVertical: 5,
  },
  cardDateBig: { fontSize: 16, color: "#666", marginBottom: 15 },

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
    padding: 12,
    borderRadius: 12,
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
  simpleShiftTime: { fontSize: 16, fontWeight: "600", color: "#333" },
  simpleShiftCaregiver: { fontSize: 13, color: "#666", marginTop: 2 },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },

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
