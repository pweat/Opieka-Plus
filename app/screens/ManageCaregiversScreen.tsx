import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
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
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme";
import { useAlert } from "../context/AlertContext";

interface CaregiverProfile {
  id: string;
  email: string;
  name?: string;
}

const ManageCaregiversScreen = ({ route }: { route: any }) => {
  const { patientId } = route.params;
  const [loading, setLoading] = useState(true);
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);

  const { showAlert } = useAlert();

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
              return { id: userDoc.id, ...userDoc.data() } as CaregiverProfile;
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
      showAlert("Błąd", "Nie udało się pobrać listy opiekunów.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssignedCaregivers();
  }, [patientId]);

  const generateInviteCode = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await addDoc(collection(db, "invitations"), {
        code: code,
        patientId: patientId,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      showAlert(
        "Kod Zaproszenia",
        `Przekaż ten kod opiekunowi:\n\n${code}\n\nWażny jednorazowo.`
      );
    } catch (error) {
      showAlert("Błąd", "Nie udało się wygenerować kodu.");
    }
  };

  const handleRemoveCaregiver = (
    caregiverId: string,
    caregiverName: string
  ) => {
    showAlert(
      "Odebrać dostęp?",
      `Czy na pewno chcesz odpiąć opiekuna ${caregiverName} od tego profilu?`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: async () => {
            try {
              const patientDocRef = doc(db, "patients", patientId);
              await updateDoc(patientDocRef, {
                caregiverIds: arrayRemove(caregiverId),
              });

              // Pokazujemy drugi alert sukcesu po usunięciu
              // Używamy setTimeout, żeby alerty się nie nałożyły
              setTimeout(() => {
                showAlert("Sukces", "Dostęp został odebrany.");
              }, 500);

              fetchAssignedCaregivers();
            } catch (error) {
              console.error("Błąd usuwania: ", error);
              setTimeout(() => {
                showAlert("Błąd", "Nie udało się usunąć opiekuna.");
              }, 500);
            }
          },
        },
      ]
    );
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
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.name || "Bez imienia"}</Text>
              <Text style={styles.cardSub}>{item.email}</Text>
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() =>
                handleRemoveCaregiver(item.id, item.name || item.email)
              }
            >
              <Text style={styles.removeButtonText}>Usuń</Text>
            </TouchableOpacity>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: theme.fonts.body,
    color: theme.colors.text,
    fontWeight: "bold",
  },
  cardSub: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ffebee",
    borderRadius: 6,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  removeButtonText: {
    color: "#d32f2f",
    fontWeight: "bold",
    fontSize: 12,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
  },
});

export default ManageCaregiversScreen;
