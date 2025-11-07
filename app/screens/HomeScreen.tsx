import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
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

// Definicje typów (bez zmian)
interface UserProfile {
  uid: string;
  email: string;
  role: "opiekun_glowny" | "opiekun";
}
interface PatientProfile {
  id: string;
  name: string;
  description: string;
}
interface Shift {
  id: string;
  patientName: string;
  start: Timestamp;
  end: Timestamp;
}

const HomeScreen = ({ navigation }: { navigation: any }) => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [inviteCode, setInviteCode] = useState("");

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchData();
    }
  }, [isFocused]);

  // Funkcja fetchData (bez zmian)
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
          const patientsList = querySnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as PatientProfile)
          );
          setPatients(patientsList);
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
            const shiftsList = shiftSnapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as Shift)
            );
            shiftsList.sort((a, b) => a.start.toMillis() - b.start.toMillis());
            setShifts(shiftsList);
          } else {
            setShifts([]);
          }
        }
      } else {
        console.log("Błąd: Nie znaleziono dokumentu użytkownika!");
      }
    }
    setLoading(false);
  };

  // === NOWA, POPRAWIONA WERSJA handleJoinWithCode ===
  const handleJoinWithCode = async () => {
    if (inviteCode.trim() === "")
      return Alert.alert("Błąd", "Wpisz kod zaproszenia.");
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true); // 1. Pokaż ekran ładowania

    const q = query(
      collection(db, "invitations"),
      where("code", "==", inviteCode.trim()),
      where("status", "==", "pending"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      setLoading(false);
      Alert.alert(
        "Błąd",
        "Nieprawidłowy lub już wykorzystany kod zaproszenia."
      );
      return;
    }

    try {
      const invitationDoc = querySnapshot.docs[0];
      const { patientId } = invitationDoc.data();
      const patientDocRef = doc(db, "patients", patientId);

      const patientDoc = await getDoc(patientDocRef);
      if (!patientDoc.exists()) {
        throw new Error("Pacjent nie istnieje");
      }

      // Poprawka błędu: Sprawdź, czy opiekun nie jest już dodany
      if (patientDoc.data()?.caregiverIds?.includes(user.uid)) {
        Alert.alert(
          "Informacja",
          "Jesteś już przypisany do tego podopiecznego."
        );
        // Kluczowe: Mimo to, musimy poprawnie ustawić stan!
        // Użyjemy fetchData(), aby pobrać poprawną listę i na tym zakończyć.
        await fetchData(); // poczekaj na pobranie danych
        return; // i zakończ funkcję
      }

      // Aktualizacje bazy danych
      await updateDoc(patientDocRef, { caregiverIds: arrayUnion(user.uid) });
      await updateDoc(invitationDoc.ref, {
        status: "accepted",
        acceptedBy: user.uid,
      });

      // === KLUCZOWA ZMIANA (NAPRAWA BŁĘDU) ===
      // Nie wołamy fetchData()! Zamiast tego ręcznie aktualizujemy stan,
      // aby *zmusić* aplikację do przełączenia widoku.
      setPatients((prevPatients) => [
        ...prevPatients,
        {
          id: patientDoc.id,
          name: patientDoc.data()?.name || "Nowy Podopieczny",
          description: patientDoc.data()?.description || "",
        } as PatientProfile,
      ]);
      setShifts([]); // Na razie nie ma żadnych wizyt

      setLoading(false); // 2. Ukryj ładowanie
      Alert.alert("Sukces!", "Zostałeś pomyślnie przypisany do podopiecznego."); // 3. Pokaż alert
    } catch (error) {
      console.error("Błąd podczas akceptowania zaproszenia: ", error);
      setLoading(false); // Pamiętaj o wyłączeniu ładowania w razie błędu
      Alert.alert("Błąd", "Wystąpił problem podczas dołączania.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Funkcja renderCaregiverView (bez zmian, ale teraz będzie działać)
  const renderCaregiverView = () => {
    // Ta logika jest poprawna. Będzie działać, bo `patients.length`
    // zostanie poprawnie zaktualizowane w `handleJoinWithCode`.
    if (patients.length > 0) {
      return (
        <>
          <Text style={styles.infoText}>Twój harmonogram</Text>
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
                <Text style={styles.shiftPatientName}>{item.patientName}</Text>
                <Text style={styles.shiftTime}>
                  {item.start.toDate().toLocaleDateString("pl-PL")} |{" "}
                  {item.start.toDate().toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {item.end.toDate().toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyListText}>
                Nie masz jeszcze zaplanowanych wizyt.
              </Text>
            }
            style={styles.list}
          />
        </>
      );
    }

    return (
      <>
        <Text style={styles.infoText}>Dołącz do profilu podopiecznego</Text>
        <TextInput
          style={styles.input}
          placeholder="Wpisz 6-cyfrowy kod"
          value={inviteCode}
          onChangeText={setInviteCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        <View style={styles.buttonContainer}>
          <Button title="Dołącz za pomocą kodu" onPress={handleJoinWithCode} />
        </View>
      </>
    );
  };

  // Funkcja renderOwnerView (bez zmian)
  const renderOwnerView = () => (
    <>
      <Text style={styles.infoText}>Twoi podopieczni</Text>
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
            <Text style={styles.patientName}>{item.name}</Text>
            <Text style={styles.patientDescription}>{item.description}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyListText}>
            Brak podopiecznych. Dodaj pierwszy profil.
          </Text>
        }
        style={styles.list}
      />
      <View style={styles.buttonContainer}>
        <Button
          title="+ Dodaj profil podopiecznego"
          onPress={() => navigation.navigate("AddPatient")}
        />
      </View>
    </>
  );

  // Główny return (bez zmian)
  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Witaj, {userProfile?.email}!</Text>
      <View style={styles.content}>
        {userProfile?.role === "opiekun_glowny"
          ? renderOwnerView()
          : renderCaregiverView()}
      </View>
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Wyloguj się</Text>
      </TouchableOpacity>
    </View>
  );
};

// Style (bez zmian)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 80,
    backgroundColor: "#f0f0f0",
  },
  content: { flex: 1, width: "100%", alignItems: "center" },
  welcomeText: {
    fontSize: 16,
    position: "absolute",
    top: 50,
    alignSelf: "center",
    color: "gray",
  },
  infoText: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  emptyListText: {
    fontSize: 16,
    color: "gray",
    textAlign: "center",
    marginTop: 50,
  },
  list: { width: "100%" },
  patientCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  patientName: { fontSize: 18, fontWeight: "bold", color: "#444" },
  patientDescription: { fontSize: 14, color: "#666", marginTop: 5 },
  logoutButton: { padding: 10, alignSelf: "center", marginBottom: 20 },
  logoutText: { color: "red", fontSize: 16 },
  input: {
    width: "80%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    fontSize: 18,
    textAlign: "center",
  },
  buttonContainer: {
    width: "90%",
    marginTop: 20,
  },
  shiftCard: {
    backgroundColor: "#e9f5ff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderColor: "#007bff",
    borderWidth: 1,
  },
  shiftPatientName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  shiftTime: {
    fontSize: 16,
    color: "#333",
    marginTop: 5,
  },
});

export default HomeScreen;
