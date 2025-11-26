import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { theme } from "../../theme";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { useAlert } from "../context/AlertContext";

interface CaregiverDashboardProps {
  patients: any[];
  shifts: any[];
  navigation: any;
  onRefresh: () => void;
}

const CaregiverDashboard = ({
  patients,
  shifts,
  navigation,
  onRefresh,
}: CaregiverDashboardProps) => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // --- NAPRAWA: Dodano brakujący stan ---
  const [isJoinModalVisible, setJoinModalVisible] = useState(false);

  const { showAlert } = useAlert();

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  // --- LOGIKA DOŁĄCZANIA ---
  const handleJoinWithCode = async () => {
    if (inviteCode.trim() === "")
      return showAlert("Błąd", "Wpisz kod zaproszenia.");
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);

    try {
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

      const invitationDoc = querySnapshot.docs[0];
      const { patientId } = invitationDoc.data();
      const patientDocRef = doc(db, "patients", patientId);
      const patientDoc = await getDoc(patientDocRef);

      if (
        patientDoc.exists() &&
        patientDoc.data()?.caregiverIds?.includes(user.uid)
      ) {
        showAlert("Informacja", "Już jesteś przypisany.");
        onRefresh();
        setJoinModalVisible(false);
        return;
      }

      await updateDoc(patientDocRef, { caregiverIds: arrayUnion(user.uid) });
      await updateDoc(invitationDoc.ref, {
        status: "accepted",
        acceptedBy: user.uid,
      });

      setLoading(false);
      setJoinModalVisible(false);
      setInviteCode("");
      showAlert("Sukces!", "Dołączono do profilu.");
      onRefresh();
    } catch (error) {
      setLoading(false);
      showAlert("Błąd", "Wystąpił problem.");
    }
  };

  // --- LOGIKA KALENDARZA I STATUSÓW ---
  const getShiftStatus = (shift: any) => {
    if (shift.status === "in_progress")
      return {
        label: "WIZYTA W TOKU",
        color: "#2E7D32",
        bg: "#E8F5E9",
        active: true,
        icon: "progress-clock",
      };
    const start = shift.start.toDate();
    const end = shift.end.toDate();
    const now = new Date();

    if (now > end)
      return {
        label: "ZALEGŁA",
        color: "#E65100",
        bg: "#FFF3E0",
        active: true,
        icon: "alert-circle-outline",
      };
    if (now >= start && now <= end)
      return {
        label: "TERAZ",
        color: "#1565C0",
        bg: "#E3F2FD",
        active: true,
        icon: "clock-alert-outline",
      };

    const isToday = start.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = start.toDateString() === tomorrow.toDateString();

    if (isToday)
      return {
        label: "DZISIAJ",
        color: "#0277BD",
        bg: "#E1F5FE",
        active: false,
        icon: "calendar-today",
      };
    if (isTomorrow)
      return {
        label: "JUTRO",
        color: "#555",
        bg: "#F5F5F5",
        active: false,
        icon: "calendar-arrow-right",
      };

    return {
      label: "NADCHODZĄCA",
      color: theme.colors.textSecondary,
      bg: "#FAFAFA",
      active: false,
      icon: "calendar-blank",
    };
  };

  // WIDOK STARTOWY (BRAK PACJENTÓW)
  if (patients.length === 0) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              justifyContent: "center",
              alignItems: "center",
              minHeight: "80%",
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullToRefresh}
            />
          }
        >
          <View style={styles.emptyDashboardContainer}>
            <View
              style={[styles.emptyIconCircle, { backgroundColor: "#FFF8E1" }]}
            >
              <MaterialCommunityIcons
                name="shield-account"
                size={80}
                color={theme.colors.primary}
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
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const activeShift = shifts.find((s) => getShiftStatus(s).active);
  const nextShift = !activeShift
    ? shifts.find((s) => s.start.toDate() > new Date())
    : null;
  const cardShift = activeShift || nextShift;

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
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handlePullToRefresh}
        />
      }
    >
      {/* KARTA STATUSU (HERO) */}
      <View style={{ marginBottom: 20 }}>
        {cardShift ? (
          (() => {
            const status = getShiftStatus(cardShift);
            return (
              <TouchableOpacity
                style={[
                  styles.heroStatusCard,
                  { backgroundColor: status.bg, borderColor: status.color },
                ]}
                onPress={() =>
                  navigation.navigate("ShiftDetail", { shiftId: cardShift.id })
                }
                activeOpacity={0.8}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 5,
                  }}
                >
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
                <Text style={styles.heroStatusName}>
                  {cardShift.patientName}
                </Text>
                <Text style={styles.heroStatusTime}>
                  {cardShift.start
                    .toDate()
                    .toLocaleTimeString("pl-PL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                  -{" "}
                  {cardShift.end
                    .toDate()
                    .toLocaleTimeString("pl-PL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                </Text>
                {!activeShift && (
                  <Text
                    style={{ fontSize: 14, color: "#666", marginBottom: 5 }}
                  >
                    {cardShift.start
                      .toDate()
                      .toLocaleDateString("pl-PL", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                  </Text>
                )}
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
          })()
        ) : (
          <View
            style={[
              styles.heroStatusCard,
              { backgroundColor: "#F5F5F5", borderColor: "#DDD" },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 5,
              }}
            >
              <MaterialCommunityIcons
                name="emoticon-happy-outline"
                size={24}
                color="gray"
              />
              <Text
                style={[
                  styles.heroStatusTitle,
                  { color: "gray", marginLeft: 5 },
                ]}
              >
                {" "}
                WOLNE
              </Text>
            </View>
            <Text
              style={[
                styles.heroStatusName,
                { fontSize: 16, fontWeight: "normal" },
              ]}
            >
              Brak nadchodzących wizyt.
            </Text>
          </View>
        )}
      </View>

      {/* LISTA PODOPIECZNYCH */}
      <Text style={styles.sectionLabel}>Moi Podopieczni</Text>
      <View style={styles.patientsRow}>
        {patients.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={styles.miniPatientCard}
            onPress={() =>
              navigation.navigate("PatientDetail", {
                patientId: p.id,
                patientName: p.name,
              })
            }
          >
            {p.photoURL ? (
              <Image source={{ uri: p.photoURL }} style={styles.miniAvatar} />
            ) : (
              <View style={styles.miniAvatarPlaceholder}>
                <Text style={styles.miniAvatarText}>
                  {p.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.miniPatientName} numberOfLines={1}>
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.miniAddCard}
          onPress={() => setJoinModalVisible(true)}
        >
          <MaterialCommunityIcons
            name="plus"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.miniAddText}>Dodaj</Text>
        </TouchableOpacity>
      </View>

      {/* KALENDARZ */}
      <Text style={styles.sectionLabel}>Harmonogram</Text>
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
        style={styles.calendar}
      />

      <Text style={styles.dateHeader}>Zadania na: {selectedDate}</Text>
      <View style={{ marginTop: 5 }}>
        {dayShifts.length > 0 ? (
          dayShifts.map((item) => (
            <TouchableOpacity
              key={item.id}
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
          ))
        ) : (
          <Text style={styles.emptyText}>Wolne! Brak wizyt tego dnia.</Text>
        )}
      </View>

      {/* PRZYCISK STATYSTYK */}
      <View style={{ marginTop: 20 }}>
        <TouchableOpacity
          style={styles.statsBtn}
          onPress={() => navigation.navigate("Stats")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={[styles.iconCircle, { backgroundColor: "#E0F2F1" }]}>
              <MaterialCommunityIcons
                name="chart-bar"
                size={24}
                color="#009688"
              />
            </View>
            <Text style={styles.statsText}>Moje podsumowanie godzin</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* MODAL DOŁĄCZANIA */}
      <Modal
        visible={isJoinModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.large,
    paddingTop: theme.spacing.medium,
  },
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

  heroStatusCard: {
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    marginBottom: 20,
    elevation: 3,
  },
  heroStatusTitle: { fontWeight: "bold", fontSize: 13, letterSpacing: 0.5 },
  heroStatusName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 5,
  },
  heroStatusTime: { fontSize: 16, color: "#555", marginTop: 5 },
  heroStatusAction: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "right",
  },
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

  sectionLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 15,
  },
  patientsRow: { flexDirection: "row", marginBottom: 20, flexWrap: "wrap" },
  miniPatientCard: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginRight: 10,
    elevation: 2,
    width: 90,
  },
  miniAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#eee",
    marginBottom: 5,
  },
  miniAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  miniAvatarText: { color: "white", fontSize: 20, fontWeight: "bold" },
  miniPatientName: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  miniAddCard: {
    backgroundColor: "#F5F5F5",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: 90,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  miniAddText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  calendar: { borderRadius: 10, elevation: 2, marginBottom: 15 },
  dateHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 10,
  },
  shiftCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: theme.colors.text },
  cardTime: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },

  statsBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  statsText: { fontSize: 16, fontWeight: "600", color: theme.colors.text },

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
    marginBottom: 25,
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

export default CaregiverDashboard;
