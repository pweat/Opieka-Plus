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

// Interfejs dla wizyty (Shift)
interface Shift {
  id: string;
  patientName: string;
  caregiverId: string; // Będziemy go potrzebować, by znaleźć e-mail
  start: { toDate: () => Date }; // Używamy toDate() do konwersji Timestamp
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
  const [shifts, setShifts] = useState<Shift[]>([]); // Nowy stan dla historii wizyt

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Pobierz dane podopiecznego (tak jak wcześniej)
        const patientDocRef = doc(db, "patients", patientId);
        const patientDoc = await getDoc(patientDocRef);
        if (patientDoc.exists()) {
          setPatient({ id: patientDoc.id, ...patientDoc.data() });
        } else {
          Alert.alert("Błąd", "Nie znaleziono podopiecznego.");
          setLoading(false);
          return;
        }

        // 2. Pobierz historię wizyt dla tego podopiecznego
        const shiftsQuery = query(
          collection(db, "shifts"),
          where("patientId", "==", patientId),
          orderBy("start", "desc") // Sortuj od najnowszej wizyty
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

    fetchData();
    // Odświeżaj dane za każdym razem, gdy ekran wraca na pierwszy plan
    // (np. po zaplanowaniu nowej wizyty)
    const unsubscribe = navigation.addListener("focus", fetchData);
    return unsubscribe; // Sprzątanie po wyjściu z ekranu
  }, [patientId, navigation]); // Zależności efektu

  if (loading) {
    return <ActivityIndicator size="large" style={styles.loadingContainer} />;
  }

  if (!patient) {
    return (
      <View style={styles.container}>
        <Text>Nie znaleziono podopiecznego.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Informacje o podopiecznym i przyciski */}
      <View style={styles.header}>
        {/* NOWY PRZYCISK EDYCJI */}
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
        <View style={styles.buttonRow}>
          <Button
            title="Zaplanuj Wizytę"
            onPress={() =>
              navigation.navigate("ScheduleVisit", {
                patientId: patient.id,
                patientName: patient.name,
              })
            }
          />
          <Button
            title="Zarządzaj Opiekunami"
            onPress={() =>
              navigation.navigate("ManageCaregivers", { patientId: patient.id })
            }
          />
        </View>
      </View>

      {/* Historia wizyt (bez zmian) */}
      <Text style={styles.historyTitle}>Historia Wizyt</Text>
      <FlatList
        data={shifts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.shiftCard}
            onPress={() =>
              navigation.navigate("ReportDetail", { shiftId: item.id })
            }
          >
            <Text style={styles.shiftDate}>
              {item.start.toDate().toLocaleDateString("pl-PL")}
            </Text>
            <Text style={styles.shiftTime}>
              {item.start.toDate().toLocaleTimeString("pl-PL", {
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  header: {
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    position: "relative", // Potrzebne dla przycisku edycji
  },
  // NOWE STYLE PRZYCISKU
  editButton: {
    position: "absolute",
    top: 15,
    right: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: "#f0f0f0",
  },
  editButtonText: {
    color: "#007bff",
    fontWeight: "600",
  },
  // Koniec nowych stylów
  name: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    marginTop: 20,
  }, // Dodany margines na górze
  description: {
    fontSize: 16,
    color: "gray",
    marginBottom: 20,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  historyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    padding: 20,
    paddingBottom: 10,
  },
  list: {
    flex: 1,
  },
  shiftCard: {
    backgroundColor: "white",
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shiftDate: {
    fontSize: 16,
    fontWeight: "bold",
  },
  shiftTime: {
    fontSize: 16,
    color: "#555",
  },
  emptyText: {
    color: "gray",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
});

export default PatientDetailScreen;
