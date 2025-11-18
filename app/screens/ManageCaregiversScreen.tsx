import React, { useState, useEffect } from "react";
import {
  View,
  Text,
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

interface CaregiverProfile {
  id: string;
  email: string;
  name?: string;
}

const ManageCaregiversScreen = ({ route }: { route: any }) => {
  const { patientId } = route.params;
  const [loading, setLoading] = useState(true);
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);

  useEffect(() => {
    const fetchAssignedCaregivers = async () => {
      setLoading(true);
      try {
        const patientDoc = await getDoc(doc(db, "patients", patientId));
        if (patientDoc.exists() && patientDoc.data().caregiverIds) {
          const ids: string[] = patientDoc.data().caregiverIds;
          const data = await Promise.all(
            ids.map(async (id) => {
              const u = await getDoc(doc(db, "users", id));
              return u.exists()
                ? ({ id: u.id, ...u.data() } as CaregiverProfile)
                : null;
            })
          );
          setCaregivers(data.filter((c) => c !== null) as CaregiverProfile[]);
        } else {
          setCaregivers([]);
        }
      } catch (error) {
        Alert.alert("Błąd", "Nie udało się pobrać listy.");
      }
      setLoading(false);
    };
    fetchAssignedCaregivers();
  }, [patientId]);

  const generateInviteCode = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await addDoc(collection(db, "invitations"), {
        code,
        patientId,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      Alert.alert("Kod Zaproszenia", `Przekaż kod: ${code}`, [{ text: "OK" }]);
    } catch (error) {
      Alert.alert("Błąd", "Nie udało się wygenerować kodu.");
    }
  };

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        color={theme.colors.primary}
        style={styles.loader}
      />
    );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.buttonPrimary}
        onPress={generateInviteCode}
      >
        <Text style={styles.buttonText}>Zaproś nowego Opiekuna</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Przypisani Opiekunowie:</Text>
      <FlatList
        data={caregivers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name || item.email}</Text>
            {item.name && <Text style={styles.cardSub}>{item.email}</Text>}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Brak przypisanych opiekunów.</Text>
        }
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
  loader: { flex: 1 },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
    elevation: 3,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: theme.colors.text,
  },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: { fontWeight: "bold", fontSize: 16, color: theme.colors.text },
  cardSub: { color: theme.colors.textSecondary, marginTop: 2 },
  empty: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
});

export default ManageCaregiversScreen;
