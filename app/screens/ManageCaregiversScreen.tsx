import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

// Interfejs dla danych opiekuna, które pobierzemy
interface CaregiverProfile {
  id: string;
  email: string;
}

const ManageCaregiversScreen = ({ route }: { route: any }) => {
  const { patientId } = route.params;
  const [loading, setLoading] = useState(true);
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);

  // useEffect do pobrania listy przypisanych opiekunów
  useEffect(() => {
    const fetchAssignedCaregivers = async () => {
      setLoading(true);
      try {
        // 1. Pobierz dokument podopiecznego
        const patientDocRef = doc(db, "patients", patientId);
        const patientDoc = await getDoc(patientDocRef);

        if (patientDoc.exists() && patientDoc.data().caregiverIds) {
          // 2. Weź tablicę ID opiekunów
          const caregiverIds: string[] = patientDoc.data().caregiverIds;

          // 3. Pobierz profil każdego opiekuna (na razie tylko e-mail)
          const caregiversData = await Promise.all(
            caregiverIds.map(async (id) => {
              const userDoc = await getDoc(doc(db, "users", id));
              if (userDoc.exists()) {
                return { id: userDoc.id, email: userDoc.data().email };
              }
              return null; // Zwróć null, jeśli nie znajdzie
            })
          );

          // 4. Ustaw stan, filtrując puste wyniki
          setCaregivers(
            caregiversData.filter((c) => c !== null) as CaregiverProfile[]
          );
        } else {
          // Jeśli nie ma tablicy 'caregiverIds', to nikt nie jest przypisany
          setCaregivers([]);
        }
      } catch (error) {
        console.error("Błąd pobierania opiekunów: ", error);
        Alert.alert("Błąd", "Nie udało się pobrać listy opiekunów.");
      }
      setLoading(false);
    };

    fetchAssignedCaregivers();
  }, [patientId]); // Uruchom ponownie, jeśli ID pacjenta się zmieni

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

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button title="Zaproś nowego Opiekuna" onPress={generateInviteCode} />
      </View>

      <Text style={styles.title}>Przypisani Opiekunowie:</Text>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={caregivers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.caregiverCard}>
              <Text style={styles.caregiverEmail}>{item.email}</Text>
              {/* W przyszłości możemy tu dodać przycisk "Usuń" */}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Brak przypisanych opiekunów.</Text>
          }
          style={{ width: "100%" }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
  },
  buttonContainer: {
    width: "100%",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  caregiverCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
  },
  caregiverEmail: {
    fontSize: 16,
  },
  emptyText: {
    color: "gray",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
});

export default ManageCaregiversScreen;
