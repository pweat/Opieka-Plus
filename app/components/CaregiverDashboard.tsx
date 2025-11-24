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
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { theme } from "../../theme"; // Upewnij się, że ścieżka jest poprawna
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
import { auth, db } from "../../firebaseConfig"; // Upewnij się, że ścieżka jest poprawna
import { useAlert } from "../context/AlertContext"; // Upewnij się, że ścieżka jest poprawna

interface CaregiverDashboardProps {
  patients: any[];
  shifts: any[];
  navigation: any;
  onRefresh: () => void; // Funkcja do odświeżania danych w HomeScreen
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
  const [isJoinModalVisible, setJoinModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  // --- LOGIKA DOŁĄCZANIA (KOD) ---
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

  // --- LOGIKA KALENDARZA I ZADAŃ ---
  const getShiftStatus = (shift: any) => {
    if (shift.status === "in_progress")
      return {
        label: "W TRAKCIE",
        color: "#1976D2",
        bg: "#E3F2FD",
        active: true,
      };
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

  // Jeśli brak pacjentów - pusty stan
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

  // Dane do renderowania
  const activeShift = shifts.find((s) => getShiftStatus(s).active);
  const nextShift = !activeShift
    ? shifts.find((s) => s.start.toDate() > new Date())
    : null;

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
    >
      {/* HERO CARD */}
      <View style={{ marginBottom: 20 }}>
        {activeShift ? (
          <TouchableOpacity
            style={[
              styles.heroStatusCard,
              { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" },
            ]}
            onPress={() =>
              navigation.navigate("ShiftDetail", { shiftId: activeShift.id })
            }
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 5,
              }}
            >
              <MaterialCommunityIcons
                name="clock-fast"
                size={24}
                color="#2e7d32"
              />
              <Text style={[styles.heroStatusTitle, { color: "#2e7d32" }]}>
                {" "}
                TERAZ / PILNE
              </Text>
            </View>
            <Text style={styles.heroStatusName}>{activeShift.patientName}</Text>
            <Text style={styles.heroStatusTime}>
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
            <Text style={styles.heroStatusAction}>
              Kliknij, aby otworzyć raport ›
            </Text>
          </TouchableOpacity>
        ) : nextShift ? (
          <View
            style={[
              styles.heroStatusCard,
              { backgroundColor: "#E3F2FD", borderColor: "#2196F3" },
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
                name="calendar-clock"
                size={24}
                color="#1565C0"
              />
              <Text style={[styles.heroStatusTitle, { color: "#1565C0" }]}>
                {" "}
                NAJBLIŻSZA WIZYTA
              </Text>
            </View>
            <Text style={styles.heroStatusName}>{nextShift.patientName}</Text>
            <Text style={styles.heroStatusTime}>
              {nextShift.start.toDate().toLocaleDateString("pl-PL")} o{" "}
              {nextShift.start
                .toDate()
                .toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </Text>
          </View>
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
              <Text style={[styles.heroStatusTitle, { color: "gray" }]}>
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
        firstDay={1} // Poniedziałek
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

// Style specyficzne dla tego widoku (skopiowane z oryginału)
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
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 3,
  },
  heroStatusTitle: { fontWeight: "bold", fontSize: 12 },
  heroStatusName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 5,
  },
  heroStatusTime: { fontSize: 14, color: "#666", marginTop: 5 },
  heroStatusAction: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "right",
  },
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
