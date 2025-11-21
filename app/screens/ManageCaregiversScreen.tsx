import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
// 1. IMPORTUJEMY SCHOWEK
import * as Clipboard from "expo-clipboard";

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

  // === NOWA FUNKCJA KOPIOWANIA ===
  const copyToClipboard = async (code: string) => {
    await Clipboard.setStringAsync(code);
  };

  const generateInviteCode = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await addDoc(collection(db, "invitations"), {
        code: code,
        patientId: patientId,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // === ZMODYFIKOWANY ALERT Z OPCJĄ KOPIOWANIA ===
      showAlert(
        "Kod Zaproszenia",
        `Przekaż ten kod opiekunce:\n\n${code}\n\nWażny jednorazowo.`,
        [
          {
            text: "Kopiuj Kod",
            onPress: () => {
              copyToClipboard(code);
              // Opcjonalnie: można pokazać małe potwierdzenie, ale samo skopiowanie wystarczy
            },
          },
          { text: "OK" },
        ]
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
              setTimeout(() => {
                showAlert("Sukces", "Dostęp został odebrany.");
              }, 500);
              fetchAssignedCaregivers();
            } catch (error) {
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

  if (caregivers.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name="account-plus"
              size={60}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>Zbuduj swój zespół</Text>
          <Text style={styles.emptyDesc}>
            Aktualnie nikt nie pomaga Ci w opiece nad tą osobą.
            {"\n\n"}
            Możesz zaprosić opiekunkę, aby ona również widziała harmonogram i
            mogła uzupełniać raporty.
          </Text>

          <View style={styles.instructionBox}>
            <Text style={styles.instructionTitle}>Jak to działa?</Text>
            <Text style={styles.instructionText}>
              1. Kliknij przycisk poniżej.
            </Text>
            <Text style={styles.instructionText}>
              2. Otrzymasz 6-cyfrowy kod.
            </Text>
            <Text style={styles.instructionText}>3. Wyślij go opiekunce.</Text>
          </View>

          <TouchableOpacity
            style={styles.bigButton}
            onPress={generateInviteCode}
          >
            <Text style={styles.bigButtonText}>Wygeneruj Kod Zaproszenia</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.buttonPrimary}
        onPress={generateInviteCode}
      >
        <Text style={styles.buttonPrimaryText}>+ Zaproś kolejną osobę</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Twój zespół:</Text>

      <FlatList
        data={caregivers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons
                name="account-circle"
                size={40}
                color={theme.colors.textSecondary}
              />
            </View>
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
              <MaterialCommunityIcons
                name="account-remove"
                size={24}
                color="#d32f2f"
              />
            </TouchableOpacity>
          </View>
        )}
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
  loadingContainer: { justifyContent: "center", alignItems: "center" },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: theme.spacing.large,
    backgroundColor: theme.colors.background,
  },
  emptyCard: {
    backgroundColor: "white",
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF8E1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 10,
  },
  emptyDesc: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  instructionBox: {
    width: "100%",
    backgroundColor: "#F5F5F5",
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
  },
  instructionTitle: {
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 5,
  },
  instructionText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 3,
  },
  bigButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 3,
    width: "100%",
    alignItems: "center",
  },
  bigButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
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
    alignItems: "center",
  },
  cardIcon: { marginRight: 15 },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: theme.fonts.body,
    color: theme.colors.text,
    fontWeight: "bold",
  },
  cardSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  removeButton: { padding: 10, borderRadius: 6, marginLeft: 10 },
});

export default ManageCaregiversScreen;
