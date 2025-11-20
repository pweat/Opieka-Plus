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
    // 1. Jeśli w bazie jest 'in_progress' (bo ktoś wszedł w wizytę)
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

    // 2. Jeśli czas pasuje (nawet jeśli status w bazie to jeszcze 'scheduled')
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

  const renderCaregiverView = () => {
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

  const renderOwnerView = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Twoi podopieczni</Text>
      <FlatList
        data={patients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.patientCard}
            onPress={() =>
              navigation.navigate("PatientDetail", {
                patientId: item.id,
                patientName: item.name,
              })
            }
          >
            <View style={styles.cardHeader}>
              {item.photoURL ? (
                <Image source={{ uri: item.photoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {/* TU BYŁ BŁĄD: Teraz używamy poprawnego stylu cardText */}
                <Text style={styles.cardText} numberOfLines={1}>
                  {item.description}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Brak podopiecznych. Dodaj kogoś.</Text>
        }
      />
    </View>
  );

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.card} />
      <View style={styles.header}>
        <Text style={styles.welcomeText} numberOfLines={1}>
          Witaj, {userProfile?.name || userProfile?.email}!
        </Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Wyloguj</Text>
        </TouchableOpacity>
      </View>

      {userProfile?.role === "opiekun_glowny"
        ? renderOwnerView()
        : renderCaregiverView()}

      {userProfile?.role === "opiekun_glowny" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddPatient")}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {userProfile?.role === "opiekun" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setJoinModalVisible(true)}
        >
          <Text style={styles.fabText}>+</Text>
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
  welcomeText: { color: theme.colors.textSecondary, fontSize: 14, flex: 1 },
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
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 2,
  },
  statusBadge: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase" },
  cardDate: { fontSize: 12, color: "#666" },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginTop: 5,
  },
  cardTime: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  // === DODANO BRAKUJĄCY STYL ===
  cardText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 5 },
  // ==============================
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
  patientCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.medium,
    borderRadius: 10,
    marginBottom: theme.spacing.medium,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  cardInfo: { flex: 1, marginLeft: theme.spacing.medium },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#eee" },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "white", fontSize: 20, fontWeight: "bold" },
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
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    width: "80%",
    padding: 20,
    borderRadius: 15,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalSub: { color: "gray", marginBottom: 20, textAlign: "center" },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 5,
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  modalBtnCancel: { padding: 10 },
  modalBtnJoin: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

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
});

export default HomeScreen;
