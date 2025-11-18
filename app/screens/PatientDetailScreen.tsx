import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme";

interface Shift {
  id: string;
  patientName: string;
  caregiverId: string;
  start: Timestamp;
  status: string;
}

interface CaregiverInfo {
  id: string;
  name: string;
  email: string;
}

const PatientDetailScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { patientId } = route.params;
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [caregiversMap, setCaregiversMap] = useState<{ [key: string]: string }>(
    {}
  );
  const [caregiversList, setCaregiversList] = useState<CaregiverInfo[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Dane pacjenta
        const patientDoc = await getDoc(doc(db, "patients", patientId));
        if (!patientDoc.exists()) {
          Alert.alert("Błąd", "Nie znaleziono podopiecznego.");
          setLoading(false);
          return;
        }
        const pData = patientDoc.data();
        setPatient({ id: patientDoc.id, ...pData });

        // 2. Historia wizyt
        const shiftsQuery = query(
          collection(db, "shifts"),
          where("patientId", "==", patientId),
          orderBy("start", "desc")
        );
        const querySnapshot = await getDocs(shiftsQuery);
        const shiftsData = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Shift)
        );
        setShifts(shiftsData);

        // 3. Zbieranie ID opiekunów
        const uniqueCaregiverIds = new Set<string>();
        shiftsData.forEach((s) => {
          if (s.caregiverId) uniqueCaregiverIds.add(s.caregiverId);
        });
        if (pData.caregiverIds) {
          pData.caregiverIds.forEach((id: string) =>
            uniqueCaregiverIds.add(id)
          );
        }

        // 4. Pobieranie danych ORAZ obsługa błędów (brakujących userów)
        const caregiversData = await Promise.all(
          Array.from(uniqueCaregiverIds).map(async (id) => {
            const u = await getDoc(doc(db, "users", id));
            if (u.exists()) {
              return { id: u.id, ...u.data() } as CaregiverInfo;
            } else {
              // Jeśli user nie istnieje (został usunięty z bazy), zwracamy "zaślepkę"
              // To naprawi problem pustego pola dla "Kociołka" jeśli jego konto zniknęło
              return {
                id: id,
                name: "Usunięty/Nieznany",
                email: "",
              } as CaregiverInfo;
            }
          })
        );

        const validCaregivers = caregiversData; // Teraz bierzemy wszystkich, nawet tych "Usuniętych"

        // 5. Budowanie mapy
        const map: { [key: string]: string } = {};
        validCaregivers.forEach((c) => {
          map[c.id] = c.name || c.email || "Bez nazwy";
        });
        setCaregiversMap(map);
        setCaregiversList(validCaregivers);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    };

    const unsubscribe = navigation.addListener("focus", fetchData);
    return unsubscribe;
  }, [patientId, navigation]);

  const filteredShifts = selectedFilter
    ? shifts.filter((s) => s.caregiverId === selectedFilter)
    : shifts;

  if (loading)
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  if (!patient)
    return (
      <View style={styles.container}>
        <Text>Brak danych.</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      {/* NAGŁÓWEK */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            navigation.navigate("EditPatient", { patientId: patient.id })
          }
        >
          <Text style={styles.editButtonText}>Edytuj</Text>
        </TouchableOpacity>

        <View style={styles.avatarContainer}>
          {patient.photoURL ? (
            <Image source={{ uri: patient.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {patient.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{patient.name}</Text>
        <Text style={styles.description}>{patient.description}</Text>

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
            <Text style={styles.buttonSecondaryText}>Opiekunowie</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTRY */}
      <View style={styles.filterSection}>
        <Text style={styles.historyTitle}>Historia Wizyt</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === null && styles.filterChipSelected,
            ]}
            onPress={() => setSelectedFilter(null)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === null && styles.filterTextSelected,
              ]}
            >
              Wszyscy
            </Text>
          </TouchableOpacity>

          {caregiversList.map((cg) => (
            <TouchableOpacity
              key={cg.id}
              style={[
                styles.filterChip,
                selectedFilter === cg.id && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedFilter(cg.id)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === cg.id && styles.filterTextSelected,
                ]}
              >
                {cg.name || cg.email || "Nieznany"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* LISTA */}
      <FlatList
        data={filteredShifts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.shiftCard}
            onPress={() =>
              navigation.navigate("ReportDetail", { shiftId: item.id })
            }
          >
            <View>
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
            </View>

            <View style={styles.caregiverBadge}>
              {/* ULEPSZONE WYŚWIETLANIE */}
              <Text style={styles.caregiverText}>
                👤 {caregiversMap[item.caregiverId] || "Brak danych"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Brak historii dla tego filtra.</Text>
        }
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    padding: theme.spacing.large,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    elevation: 3,
    alignItems: "center",
  },
  editButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
    backgroundColor: theme.colors.background,
    borderRadius: 5,
    zIndex: 10,
  },
  editButtonText: { color: theme.colors.primary, fontWeight: "600" },
  avatarContainer: { marginBottom: 10, marginTop: 20 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#eee",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "white", fontSize: 40, fontWeight: "bold" },
  name: {
    fontSize: theme.fonts.title,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.fonts.body,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  buttonPrimaryText: { color: theme.colors.primaryText, fontWeight: "bold" },
  buttonSecondaryText: { color: theme.colors.primary, fontWeight: "bold" },
  filterSection: {
    paddingVertical: 10,
    backgroundColor: theme.colors.background,
  },
  historyTitle: {
    fontSize: theme.fonts.subtitle,
    fontWeight: "bold",
    color: theme.colors.text,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filterScroll: { paddingHorizontal: 20, paddingBottom: 10 },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: { color: theme.colors.text, fontWeight: "500" },
  filterTextSelected: { color: "white" },
  list: { flex: 1 },
  shiftCard: {
    backgroundColor: theme.colors.card,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontWeight: "bold", color: theme.colors.text },
  cardText: { color: theme.colors.textSecondary },
  caregiverBadge: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  caregiverText: { fontSize: 12, color: theme.colors.text, fontWeight: "bold" },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
  },
});

export default PatientDetailScreen;
