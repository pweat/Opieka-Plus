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
} from "firebase/firestore";
import { useIsFocused } from "@react-navigation/native";

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

const HomeScreen = ({ navigation }: { navigation: any }) => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [inviteCode, setInviteCode] = useState(""); // Stan dla kodu zaproszenia

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchData();
    }
  }, [isFocused]);

  const fetchData = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      // --- PUNKT KONTROLNY 1 ---
      // Sprawdźmy, czy na pewno mamy poprawne ID zalogowanego użytkownika
      console.log("Szukam danych dla użytkownika o ID:", user.uid);

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile;
        setUserProfile(profile);

        if (profile.role === "opiekun_glowny") {
          // Tworzymy zapytanie do kolekcji "patients"
          const q = query(
            collection(db, "patients"),
            where("ownerId", "==", user.uid)
          );

          const querySnapshot = await getDocs(q);

          // --- PUNKT KONTROLNY 2 ---
          // Sprawdźmy, ile dokumentów znalazło nasze zapytanie
          console.log(
            `Zapytanie o podopiecznych znalazło: ${querySnapshot.size} dokumentów.`
          );

          const patientsList: PatientProfile[] = [];
          querySnapshot.forEach((doc) => {
            patientsList.push({ id: doc.id, ...doc.data() } as PatientProfile);
          });

          // --- PUNKT KONTROLNY 3 ---
          // Zobaczmy, jak wygląda nasza finalna lista przed zapisaniem w stanie
          console.log(
            "Finalna lista podopiecznych do wyświetlenia:",
            patientsList
          );

          setPatients(patientsList);
        }
        // ... reszta logiki dla 'opiekun' ...
      }
    }
    setLoading(false);
  };

  // NOWA FUNKCJA: Obsługa dołączania za pomocą kodu
  const handleJoinWithCode = async () => {
    if (inviteCode.trim() === "") {
      Alert.alert("Błąd", "Wpisz kod zaproszenia.");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    // 1. Znajdź zaproszenie w bazie
    const q = query(
      collection(db, "invitations"),
      where("code", "==", inviteCode),
      where("status", "==", "pending"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      Alert.alert("Błąd", "Nieprawidłowy lub wykorzystany kod zaproszenia.");
      return;
    }

    try {
      const invitationDoc = querySnapshot.docs[0];
      const { patientId } = invitationDoc.data();

      // 2. Dodaj ID opiekuna do tablicy 'caregiverIds' w profilu podopiecznego
      const patientDocRef = doc(db, "patients", patientId);
      await updateDoc(patientDocRef, {
        caregiverIds: arrayUnion(user.uid), // arrayUnion dodaje element do tablicy, jeśli jeszcze go tam nie ma
      });

      // 3. Zmień status zaproszenia na 'accepted'
      await updateDoc(invitationDoc.ref, {
        status: "accepted",
        acceptedBy: user.uid,
      });

      Alert.alert("Sukces!", "Zostałeś pomyślnie przypisany do podopiecznego.");
      fetchData(); // Odśwież dane, aby zobaczyć zmiany
    } catch (error) {
      console.error("Błąd podczas akceptowania zaproszenia: ", error);
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

  // Funkcja renderująca widok dla Opiekuna (wydzielona dla czytelności)
  const renderCaregiverView = () => {
    if (patients.length > 0) {
      return (
        <>
          <Text style={styles.infoText}>Twoi podopieczni</Text>
          <FlatList
            data={patients}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.patientCard}>
                <Text style={styles.patientName}>{item.name}</Text>
              </TouchableOpacity>
            )}
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

  // Funkcja renderująca widok dla Opiekuna Głównego
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
              navigation.navigate("PatientDetail", { patientId: item.id })
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

// Tutaj wklej całą sekcję ze stylami, którą miałeś wcześniej
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
});

export default HomeScreen;
