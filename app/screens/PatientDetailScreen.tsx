import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme"; // Importujemy motyw

// Interfejs dla wizyty (Shift)
interface Shift {
  id: string;
  patientName: string;
  caregiverId: string;
  start: { toDate: () => Date };
  status: string;
}

const PatientDetailScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { patientId, patientName } = route.params;
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Pobierz dane podopiecznego
        const patientDocRef = doc(db, "patients", patientId);
        const patientDoc = await getDoc(patientDocRef);
        if (patientDoc.exists()) {
          setPatient({ id: patientDoc.id, ...patientDoc.data() });
        } else {
          Alert.alert("Błąd", "Nie znaleziono podopiecznego.");
          setLoading(false);
          return;
        }

        // 2. Pobierz historię wizyt
        const shiftsQuery = query(
          collection(db, "shifts"),
          where("patientId", "==", patientId),
          orderBy("start", "desc")
        );
        const querySnapshot = await getDocs(shiftsQuery);
        const shiftsList = querySnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Shift)
        );
        setShifts(shiftsList);
      } catch (error) {
        console.error("Błąd pobierania danych: ", error);
        Alert.alert("Błąd", "Nie udało się pobrać danych.");
      }
      setLoading(false);
    };

    // Odświeżaj dane za każdym razem, gdy ekran wraca na pierwszy plan
    const unsubscribe = navigation.addListener("focus", fetchData);
    return unsubscribe;
  }, [patientId, navigation]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.container}>
        <Text>Nie znaleziono podopiecznego.</Text>
      </View>
    );
  }

  return (
    // Używamy tła z motywu dla całego ekranu
    <View style={styles.container}>
      {/* Informacje o podopiecznym i przyciski */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            navigation.navigate("EditPatient", { patientId: patient.id })
          }
        >
          <Text style={styles.editButtonText}>Edytuj</Text>
        </TouchableOpacity>
        <Text style={styles.name}>{patient.name}</Text>
        <Text style={styles.description}>{patient.description}</Text>

        {/* NOWE, STYLIZOWANE PRZYCISKI */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() =>
              navigation.navigate("ScheduleVisit", {
                patientId: patient.id,
                patientName: patient.name,
              })
            }
          >
            <Text style={styles.buttonPrimaryText}>Zaplanuj Wizytę</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() =>
              navigation.navigate("ManageCaregivers", { patientId: patient.id })
            }
          >
            <Text style={styles.buttonSecondaryText}>Zarządzaj Opiekunami</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Historia wizyt */}
      <Text style={styles.historyTitle}>Historia Wizyt</Text>
      <FlatList
        data={shifts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.shiftCard} // Używamy stylu karty
            onPress={() =>
              navigation.navigate("ReportDetail", { shiftId: item.id })
            }
          >
            <Text style={styles.cardTitle}>
              {item.start.toDate().toLocaleDateString("pl-PL")}
            </Text>
            <Text style={styles.cardText}>
              Godz:{" "}
              {item.start
                .toDate()
                .toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Brak historii wizyt.</Text>
        }
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Tło z motywu
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: theme.spacing.large,
    backgroundColor: theme.colors.card, // Białe tło dla nagłówka
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    position: "relative",
    elevation: 3, // Cień
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  editButton: {
    position: "absolute",
    top: theme.spacing.medium,
    right: theme.spacing.medium,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.background, // Beżowe tło
  },
  editButtonText: {
    color: theme.colors.primary, // Brązowy tekst
    fontWeight: "600",
  },
  name: {
    fontSize: theme.fonts.title,
    fontWeight: "bold",
    marginBottom: theme.spacing.small,
    textAlign: "center",
    marginTop: theme.spacing.medium,
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.fonts.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.large,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  // STYL GŁÓWNEGO PRZYCISKU
  buttonPrimary: {
    flex: 1, // Aby dzieliły przestrzeń
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: theme.spacing.small,
  },
  buttonPrimaryText: {
    color: theme.colors.primaryText,
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
  // STYL DRUGIEGO PRZYCISKU (Z KONTUREM)
  buttonSecondary: {
    flex: 1, // Aby dzieliły przestrzeń
    backgroundColor: theme.colors.card, // Białe tło
    borderWidth: 1,
    borderColor: theme.colors.primary, // Brązowa ramka
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: theme.spacing.small,
  },
  buttonSecondaryText: {
    color: theme.colors.primary, // Brązowy tekst
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
  historyTitle: {
    fontSize: theme.fonts.subtitle,
    fontWeight: "bold",
    color: theme.colors.text,
    padding: theme.spacing.large,
    paddingBottom: theme.spacing.small,
  },
  list: {
    flex: 1,
    paddingHorizontal: theme.spacing.large, // Odstęp dla listy
  },
  // Styl karty dla historii wizyt
  shiftCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.medium,
    borderRadius: 10,
    marginBottom: theme.spacing.medium,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: {
    fontSize: theme.fonts.body,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  cardText: {
    fontSize: theme.fonts.body,
    color: theme.colors.textSecondary,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default PatientDetailScreen;
