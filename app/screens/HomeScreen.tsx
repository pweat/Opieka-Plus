import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
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
// 1. Importujemy nasz hook
import { useAlert } from "../context/AlertContext";

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
  const [inviteCode, setInviteCode] = useState("");
  const isFocused = useIsFocused();

  // 2. Inicjalizujemy alerty
  const { showAlert } = useAlert();

  useEffect(() => {
    if (isFocused) fetchData();
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
    // 3. Podmieniamy Alert.alert na showAlert
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
      return showAlert(
        "Błąd",
        "Nieprawidłowy lub już wykorzystany kod zaproszenia."
      );
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
        showAlert("Informacja", "Jesteś już przypisany do tego podopiecznego.");
        await fetchData();
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
      setShifts([]);
      setLoading(false);
      showAlert("Sukces!", "Dołączyłeś do profilu podopiecznego.");
    } catch (error) {
      setLoading(false);
      showAlert("Błąd", "Wystąpił problem podczas dołączania.");
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );

  const renderCaregiverView = () => (
    <View style={styles.content}>
      {patients.length > 0 ? (
        <>
          <Text style={styles.title}>Zaplanowane wizyty</Text>
          <FlatList
            data={shifts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.shiftCard}
                onPress={() =>
                  navigation.navigate("ShiftDetail", { shiftId: item.id })
                }
              >
                <Text style={styles.cardTitle}>{item.patientName}</Text>
                <Text style={styles.cardText}>
                  {item.start.toDate().toLocaleDateString("pl-PL")}
                </Text>
                <Text style={styles.cardText}>
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
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyText}>
                  Brak zadań na horyzoncie! 🎉
                </Text>
                <Text style={styles.subEmptyText}>
                  Wszystkie wizyty zostały zakończone.
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <>
          <Text style={styles.title}>Witaj!</Text>
          <Text style={styles.emptyText}>
            Nie jesteś jeszcze przypisany do żadnego podopiecznego. Poproś
            Opiekuna Głównego o 6-cyfrowy kod zaproszenia i wprowadź go poniżej.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Wpisz 6-cyfrowy kod"
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={handleJoinWithCode}
          >
            <Text style={styles.buttonPrimaryText}>Dołącz</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

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
  emptyText: {
    fontSize: theme.fonts.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.large,
    lineHeight: 22,
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
  shiftCard: {
    backgroundColor: "#e9f5ff",
    padding: theme.spacing.medium,
    borderRadius: 10,
    marginBottom: theme.spacing.medium,
    borderWidth: 1,
    borderColor: "#bce0ff",
  },
  cardTitle: {
    fontSize: theme.fonts.subtitle,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  cardText: {
    fontSize: theme.fonts.body,
    color: theme.colors.textSecondary,
    marginTop: 2,
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
});

export default HomeScreen;
