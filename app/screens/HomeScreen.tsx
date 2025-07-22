import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
// Importujemy potrzebne funkcje i obiekty
import { auth, db } from "../../firebaseConfig";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Definiujemy typ dla naszego profilu użytkownika, dla porządku w kodzie
interface UserProfile {
  uid: string;
  email: string;
  role: "opiekun_glowny" | "opiekun";
  createdAt: Date;
}

const HomeScreen = () => {
  // Stan do przechowywania informacji o tym, czy dane się ładują
  const [loading, setLoading] = useState(true);
  // Stan do przechowywania profilu użytkownika pobranego z Firestore
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Ten 'useEffect' uruchomi się tylko raz, gdy ekran się załaduje.
  // Jego zadaniem jest pobranie danych o zalogowanym użytkowniku.
  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = auth.currentUser; // Pobieramy aktualnego użytkownika z Authentication
      if (user) {
        // Tworzymy referencję do dokumentu użytkownika w kolekcji "users"
        const userDocRef = doc(db, "users", user.uid);
        // Pobieramy dane tego dokumentu
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          // Jeśli dokument istnieje, zapisujemy jego dane w naszym stanie
          setUserProfile(userDoc.data() as UserProfile);
        } else {
          console.error(
            "Nie znaleziono danych profilu użytkownika w Firestore!"
          );
          // Można by tu obsłużyć błąd, np. wylogowując użytkownika
        }
      }
      setLoading(false); // Kończymy ładowanie
    };

    fetchUserProfile();
  }, []); // Pusta tablica `[]` gwarantuje jednorazowe uruchomienie

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Błąd podczas wylogowywania:", error);
    }
  };

  // --- Renderowanie komponentu ---

  // 1. Jeśli dane się jeszcze ładują, pokazujemy wskaźnik ładowania
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // 2. Jeśli nie udało się pobrać profilu, pokazujemy błąd
  if (!userProfile) {
    return (
      <View style={styles.container}>
        <Text>Nie udało się załadować profilu.</Text>
        <Button title="Wyloguj się" onPress={handleLogout} />
      </View>
    );
  }

  // 3. Jeśli wszystko się udało, renderujemy widok na podstawie roli użytkownika
  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Witaj, {userProfile.email}!</Text>

      {userProfile.role === "opiekun_glowny" ? (
        // Widok dla Opiekuna Głównego
        <View style={styles.content}>
          <Text style={styles.infoText}>
            Zarządzaj profilami swoich podopiecznych.
          </Text>
          {/* Na razie wyświetlamy tylko tekst, później będzie tu lista */}
          <Text style={styles.emptyListText}>
            Nie masz jeszcze żadnych podopiecznych.
          </Text>
          <Button
            title="+ Dodaj profil podopiecznego"
            onPress={() => {
              /* Tę funkcję dodamy za chwilę */
            }}
          />
        </View>
      ) : (
        // Widok dla Opiekuna
        <View style={styles.content}>
          <Text style={styles.infoText}>Twój harmonogram pracy.</Text>
          {/* Na razie wyświetlamy tylko tekst, później będzie tu harmonogram */}
          <Text style={styles.emptyListText}>
            Nie masz jeszcze zaplanowanych wizyt.
          </Text>
        </View>
      )}

      <Button title="Wyloguj się" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  welcomeText: {
    fontSize: 18,
    position: "absolute",
    top: 60,
    color: "gray",
  },
  infoText: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyListText: {
    fontSize: 16,
    color: "gray",
    marginBottom: 20,
  },
});

export default HomeScreen;
