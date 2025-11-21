import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { theme } from "../../theme";
import { signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  limit,
  Timestamp,
} from "firebase/firestore";
import { useIsFocused } from "@react-navigation/native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { useAlert } from "../context/AlertContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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

interface UserProfile {
  uid: string;
  email: string;
  role: "opiekun_glowny" | "opiekun";
  name?: string;
}
interface PatientProfile {
  id: string;
  name: string;
  description: string;
  photoURL?: string;
}
interface Shift {
  id: string;
  patientName: string;
  start: Timestamp;
  end: Timestamp;
  status: string;
}

const HomeScreen = ({ navigation }: { navigation: any }) => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isJoinModalVisible, setJoinModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const isFocused = useIsFocused();
  const { showAlert } = useAlert();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (isFocused) fetchData();
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, [isFocused]);

  const fetchData = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile;
        setUserProfile(profile);

        if (profile.role === "opiekun_glowny") {
          const q = query(
            collection(db, "patients"),
            where("ownerId", "==", user.uid)
          );
          const querySnapshot = await getDocs(q);
          setPatients(
            querySnapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as PatientProfile)
            )
          );
        } else if (profile.role === "opiekun") {
          const patientQuery = query(
            collection(db, "patients"),
            where("caregiverIds", "array-contains", user.uid)
          );
          const patientSnapshot = await getDocs(patientQuery);
          const patientsList = patientSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as PatientProfile)
          );
          setPatients(patientsList);

          if (patientsList.length > 0) {
            const shiftQuery = query(
              collection(db, "shifts"),
              where("caregiverId", "==", user.uid)
            );
            const shiftSnapshot = await getDocs(shiftQuery);
            const allShifts = shiftSnapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as Shift)
            );

            const activeShifts = allShifts.filter(
              (s) => s.status !== "completed"
            );
            activeShifts.sort(
              (a, b) => a.start.toMillis() - b.start.toMillis()
            );
            setShifts(activeShifts);
          } else {
            setShifts([]);
          }
        }
      }
    }
    setLoading(false);
  };

  const handleJoinWithCode = async () => {
    if (inviteCode.trim() === "")
      return showAlert("Błąd", "Wpisz kod zaproszenia.");
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    const q = query(
      collection(db, "invitations"),
      where("code", "==", inviteCode.trim()),
      where("status", "==", "pending"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      setLoading(false);
      return showAlert("Błąd", "Nieprawidłowy lub zużyty kod.");
    }
    try {
      const invitationDoc = querySnapshot.docs[0];
      const { patientId } = invitationDoc.data();
      const patientDocRef = doc(db, "patients", patientId);
      const patientDoc = await getDoc(patientDocRef);

      if (
        patientDoc.exists() &&
        patientDoc.data()?.caregiverIds?.includes(user.uid)
      ) {
        showAlert("Informacja", "Już jesteś przypisany.");
        await fetchData();
        setJoinModalVisible(false);
        return;
      }
      await updateDoc(patientDocRef, { caregiverIds: arrayUnion(user.uid) });
      await updateDoc(invitationDoc.ref, {
        status: "accepted",
        acceptedBy: user.uid,
      });

      setPatients((prev) => [
        ...prev,
        { id: patientId, name: patientDoc.data()?.name || "", description: "" },
      ]);
      setLoading(false);
      setJoinModalVisible(false);
      setInviteCode("");
      showAlert("Sukces!", "Dołączono do profilu.");
      fetchData();
    } catch (error) {
      setLoading(false);
      showAlert("Błąd", "Wystąpił problem.");
    }
  };

  const handleLogout = () => signOut(auth);

  const getShiftStatus = (shift: Shift) => {
    if (shift.status === "in_progress") {
      return {
        label: "W TRAKCIE",
        color: "#1976D2",
        bg: "#E3F2FD",
        active: true,
      };
    }
    const start = shift.start.toDate();
    const end = shift.end.toDate();
    const now = new Date();

    if (now >= start && now <= end)
      return {
        label: "CZAS NA WIZYTĘ",
        color: "#4CAF50",
        bg: "#E8F5E9",
        active: true,
      };
    if (now > end)
      return {
        label: "PO CZASIE",
        color: "#FF9800",
        bg: "#FFF3E0",
        active: true,
      };

    return {
      label: "ZAPLANOWANA",
      color: theme.colors.textSecondary,
      bg: "#F5F5F5",
      active: false,
    };
  };

  // === WIDOK OPIEKUNA ===
  const renderCaregiverView = () => {
    // SCENARIUSZ 0: Brak przypisanych podopiecznych
    if (patients.length === 0) {
      return (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              justifyContent: "center",
              alignItems: "center",
              minHeight: "80%",
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", alignItems: "center" }}
          >
            <View style={styles.emptyDashboardContainer}>
              <View
                style={[styles.emptyIconCircle, { backgroundColor: "#E3F2FD" }]}
              >
                <MaterialCommunityIcons
                  name="shield-account"
                  size={80}
                  color="#1976D2"
                />
              </View>
              <Text style={styles.emptyTitle}>Witaj w Zespole!</Text>
              <Text style={styles.emptyDesc}>
                Aktualnie nie jesteś przypisany/a do żadnego podopiecznego.
                {"\n\n"}
                Aby rozpocząć pracę, poproś Opiekuna Głównego o 6-cyfrowy kod
                zaproszenia.
              </Text>

              <View style={{ width: "100%", marginTop: 5 }}>
                <TextInput
                  style={styles.bigInput}
                  placeholder="Kod zaproszenia"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                />
                <TouchableOpacity
                  style={styles.bigAddButton}
                  onPress={handleJoinWithCode}
                >
                  <Text style={styles.bigAddButtonText}>Dołącz do Zespołu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </ScrollView>
      );
    }

    // SCENARIUSZ 1: Są podopieczni
    const activeShift = shifts.find((s) => getShiftStatus(s).active);
    const markedDates: any = {};
    shifts.forEach((s) => {
      const dateKey = s.start.toDate().toISOString().split("T")[0];
      markedDates[dateKey] = { marked: true, dotColor: theme.colors.primary };
    });
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: theme.colors.primary,
    };
    const dayShifts = shifts.filter(
      (s) => s.start.toDate().toISOString().split("T")[0] === selectedDate
    );

    return (
      <View style={styles.content}>
        {activeShift && (
          <View style={styles.prioritySection}>
            <Text style={styles.priorityTitle}>🔴 TERAZ / PILNE</Text>
            <TouchableOpacity
              style={[
                styles.shiftCard,
                {
                  backgroundColor: "#E8F5E9",
                  borderColor: "#4CAF50",
                  borderWidth: 2,
                },
              ]}
              onPress={() =>
                navigation.navigate("ShiftDetail", { shiftId: activeShift.id })
              }
            >
              <Text style={styles.cardTitle}>{activeShift.patientName}</Text>
              <Text style={styles.cardTime}>
                {activeShift.start
                  .toDate()
                  .toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                -{" "}
                {activeShift.end
                  .toDate()
                  .toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </Text>
              <Text
                style={{ color: "#2e7d32", fontWeight: "bold", marginTop: 5 }}
              >
                KLIKNIJ ABY OTWORZYĆ
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
          style={styles.calendar}
        />

        <Text style={styles.dateHeader}>Zadania na: {selectedDate}</Text>
        <FlatList
          data={dayShifts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.shiftCard}
              onPress={() =>
                navigation.navigate("ShiftDetail", { shiftId: item.id })
              }
            >
              <Text style={styles.cardTitle}>{item.patientName}</Text>
              <Text style={styles.cardTime}>
                {item.start
                  .toDate()
                  .toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                -{" "}
                {item.end
                  .toDate()
                  .toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Wolne! Brak wizyt tego dnia.</Text>
          }
          style={{ marginTop: 5 }}
        />
      </View>
    );
  };

  // === WIDOK OPIEKUNA GŁÓWNEGO ===
  const renderOwnerView = () => {
    // SCENARIUSZ 0: Brak podopiecznych
    if (patients.length === 0) {
      return (
        <View
          style={[
            styles.content,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <View style={styles.emptyDashboardContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons
                name="account-heart"
                size={80}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>Zacznijmy!</Text>
            <Text style={styles.emptyDesc}>
              Aktualnie nie masz przypisanych żadnych podopiecznych.
              {"\n\n"}
              Utwórz profil dla bliskiej osoby, aby móc planować wizyty i
              zarządzać opieką.
            </Text>

            <TouchableOpacity
              style={styles.bigAddButton}
              onPress={() => navigation.navigate("AddPatient")}
            >
              <MaterialCommunityIcons
                name="plus-circle"
                size={24}
                color="white"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.bigAddButtonText}>Dodaj Podopiecznego</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // SCENARIUSZ 1: Jeden podopieczny (PULPIT)
    if (patients.length === 1) {
      const p = patients[0];
      return (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroAvatarContainer}>
                {p.photoURL ? (
                  <Image
                    source={{ uri: p.photoURL }}
                    style={styles.heroAvatar}
                  />
                ) : (
                  <View style={styles.heroAvatarPlaceholder}>
                    <Text style={styles.heroAvatarText}>
                      {p.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1, justifyContent: "center" }}>
                <Text style={styles.heroLabel}>PODOPIECZNY</Text>
                <Text style={styles.heroName}>{p.name}</Text>
                <Text style={styles.heroDesc} numberOfLines={2}>
                  {p.description}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.heroMainButton}
              onPress={() =>
                navigation.navigate("PatientDetail", {
                  patientId: p.id,
                  patientName: p.name,
                })
              }
            >
              <Text style={styles.heroMainButtonText}>Otwórz Panel</Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color="white"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Szybkie Akcje</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                navigation.navigate("ScheduleVisit", {
                  patientId: p.id,
                  patientName: p.name,
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
                navigation.navigate("ManageCaregivers", { patientId: p.id })
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
                navigation.navigate("MedicalHistory", { patientId: p.id })
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
                navigation.navigate("EditPatient", { patientId: p.id })
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
    }

    // SCENARIUSZ 2: Wiele osób (LISTA)
    return (
      <View style={styles.content}>
        <Text style={styles.title}>Twoi podopieczni</Text>
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.patientCard}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("PatientDetail", {
                  patientId: item.id,
                  patientName: item.name,
                })
              }
            >
              <View style={styles.cardInner}>
                <View style={styles.avatarWrapper}>
                  {item.photoURL ? (
                    <Image
                      source={{ uri: item.photoURL }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>PODOPIECZNY</Text>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={1}>
                    {item.description || "Brak opisu"}
                  </Text>
                </View>
                <View style={styles.arrowContainer}>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Brak podopiecznych. Dodaj kogoś.
            </Text>
          }
          style={styles.list}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.card} />
      <View style={styles.header}>
        <Text style={styles.welcomeText} numberOfLines={1}>
          Witaj,{" "}
          <Text style={{ fontWeight: "bold", color: theme.colors.primary }}>
            {userProfile?.name || userProfile?.email}
          </Text>
          !
        </Text>
        <TouchableOpacity onPress={handleLogout}>
          <MaterialCommunityIcons
            name="logout"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      {userProfile?.role === "opiekun_glowny"
        ? renderOwnerView()
        : renderCaregiverView()}

      {userProfile?.role === "opiekun_glowny" && patients.length > 1 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddPatient")}
        >
          <MaterialCommunityIcons name="plus" size={30} color="white" />
        </TouchableOpacity>
      )}

      {userProfile?.role === "opiekun" && patients.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setJoinModalVisible(true)}
        >
          <MaterialCommunityIcons name="plus" size={30} color="white" />
        </TouchableOpacity>
      )}

      <Modal
        visible={isJoinModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Dołącz do profilu</Text>
            <Text style={styles.modalSub}>
              Wpisz 6-cyfrowy kod od Opiekuna Głównego:
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="123456"
              value={inviteCode}
              onChangeText={setInviteCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setJoinModalVisible(false)}
              >
                <Text style={{ color: "gray" }}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnJoin}
                onPress={handleJoinWithCode}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Dołącz
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.large,
    paddingBottom: theme.spacing.medium,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 50,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    elevation: 3,
  },
  welcomeText: { color: theme.colors.text, fontSize: 16, flex: 1 },
  logoutText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "bold",
    paddingLeft: theme.spacing.small,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.large,
    paddingTop: theme.spacing.medium,
  },
  title: {
    fontSize: theme.fonts.title,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.medium,
  },

  // EMPTY STATE
  emptyDashboardContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
    backgroundColor: "white",
    padding: 30,
    borderRadius: 20,
    elevation: 3,
    width: "100%",
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFF8E1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 10,
  },
  emptyDesc: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 24,
  },
  bigAddButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
    elevation: 5,
    width: "100%",
  },
  bigAddButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  bigInput: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 15,
    padding: 15,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 5,
    marginBottom: 20,
  },

  // CARD STYLES (Opiekun Główny)
  heroCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    marginBottom: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  heroHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  heroAvatarContainer: { marginRight: 15 },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eee",
  },
  heroAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  heroAvatarText: { color: "white", fontSize: 32, fontWeight: "bold" },
  heroLabel: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroName: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 4,
  },
  heroDesc: { fontSize: 14, color: theme.colors.textSecondary },
  heroMainButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  heroMainButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },

  // KARTA PACJENTA (LISTA)
  patientCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.medium,
    borderRadius: 16,
    marginBottom: theme.spacing.medium,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardInner: { flexDirection: "row", alignItems: "center", padding: 15 },
  avatarWrapper: {
    padding: 2,
    backgroundColor: "white",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 1,
  },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#eee" },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "white", fontSize: 24, fontWeight: "bold" },
  cardContent: { flex: 1, marginLeft: 15, justifyContent: "center" },
  cardLabel: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: theme.colors.text },
  cardDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  arrowContainer: { marginLeft: 10 },

  sectionLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 15,
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

  // OPIEKUNKA - WIDOK
  prioritySection: { marginBottom: 15 },
  priorityTitle: {
    color: "#d32f2f",
    fontWeight: "bold",
    marginBottom: 5,
    fontSize: 12,
  },
  calendar: { borderRadius: 10, elevation: 2, marginBottom: 15 },
  dateHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 10,
  },

  shiftCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 2,
  },
  statusBadge: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase" },
  cardDate: { fontSize: 12, color: "#666" },
  cardTime: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  cardText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 5 },

  list: { width: "100%" },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
  subEmptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 5,
  },
  emptyStateContainer: { alignItems: "center", marginTop: 50 },

  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
    fontSize: theme.fonts.body,
    color: theme.colors.text,
    marginTop: theme.spacing.large,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
    elevation: 3,
  },
  buttonPrimaryText: {
    color: theme.colors.primaryText,
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },

  fab: {
    position: "absolute",
    right: theme.spacing.large,
    bottom: theme.spacing.large,
    backgroundColor: theme.colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  fabText: {
    color: theme.colors.primaryText,
    fontSize: 30,
    lineHeight: 30,
    marginTop: -2,
  },

  // MODAL
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    width: "85%",
    padding: 25,
    borderRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: theme.colors.text,
  },
  modalSub: { color: "gray", marginBottom: 20, textAlign: "center" },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 5,
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  modalBtnCancel: { padding: 15 },
  modalBtnJoin: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    elevation: 2,
  },
});

export default HomeScreen;
