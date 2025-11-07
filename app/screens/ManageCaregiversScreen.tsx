import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme";

// Interfejs dla danych opiekuna
interface CaregiverProfile {
  id: string;
  email: string;
  name?: string; // Dodajemy opcjonalne imię
}

const ManageCaregiversScreen = ({ route }: { route: any }) => {
  const { patientId } = route.params;
  const [loading, setLoading] = useState(true);
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);

  // POPRAWKA: Pobieramy pełny profil użytkownika
  useEffect(() => {
    const fetchAssignedCaregivers = async () => {
      setLoading(true);
      try {
        const patientDocRef = doc(db, "patients", patientId);
        const patientDoc = await getDoc(patientDocRef);

        if (patientDoc.exists() && patientDoc.data().caregiverIds) {
          const caregiverIds: string[] = patientDoc.data().caregiverIds;
          const caregiversData = await Promise.all(
            caregiverIds.map(async (id) => {
              const userDoc = await getDoc(doc(db, "users", id));
              if (userDoc.exists()) {
                // Zwracamy cały profil, a nie tylko email
                return {
                  id: userDoc.id,
                  ...userDoc.data(),
                } as CaregiverProfile;
              }
              return null;
            })
          );
          setCaregivers(
            caregiversData.filter((c) => c !== null) as CaregiverProfile[]
          );
        } else {
          setCaregivers([]);
        }
      } catch (error) {
        console.error("Błąd pobierania opiekunów: ", error);
        Alert.alert("Błąd", "Nie udało się pobrać listy opiekunów.");
      }
      setLoading(false);
    };
    fetchAssignedCaregivers();
  }, [patientId]);

  // Funkcja generowania kodu (bez zmian)
  const generateInviteCode = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await addDoc(collection(db, "invitations"), {
        code: code,
        patientId: patientId,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      Alert.alert(
        "Wygenerowano Kod Zaproszenia",
        `Przekaż ten kod opiekunowi: ${code}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Błąd generowania kodu: ", error);
      Alert.alert("Błąd", "Nie udało się wygenerować kodu zaproszenia.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.buttonPrimary}
        onPress={generateInviteCode}
      >
        <Text style={styles.buttonPrimaryText}>Zaproś nowego Opiekuna</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Przypisani Opiekunowie:</Text>

      <FlatList
        data={caregivers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* POPRAWKA: Wyświetlamy imię, a jeśli go nie ma - e-mail */}
            <Text style={styles.cardTitle}>{item.name || item.email}</Text>
            {/* Pokazujemy e-mail jako drugą informację, jeśli jest imię */}
            {item.name && <Text style={styles.cardText}>{item.email}</Text>}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Brak przypisanych opiekunów.</Text>
        }
        style={{ width: "100%" }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.large,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: theme.spacing.large,
    elevation: 3,
  },
  buttonPrimaryText: {
    color: theme.colors.primaryText,
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
  title: {
    fontSize: theme.fonts.subtitle,
    fontWeight: "bold",
    marginBottom: theme.spacing.medium,
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.medium,
    borderRadius: 10,
    marginBottom: theme.spacing.medium,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: {
    fontSize: theme.fonts.body,
    color: theme.colors.text,
    fontWeight: "bold",
  },
  cardText: {
    fontSize: 14, // Trochę mniejszy
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.small / 2,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
  },
});

export default ManageCaregiversScreen;
