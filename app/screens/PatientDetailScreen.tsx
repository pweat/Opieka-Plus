import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  FlatList,
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
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme";
import { Calendar, LocaleConfig } from "react-native-calendars";

LocaleConfig.locales["pl"] = {
  monthNames: [
    "Styczeń",
    "Luty",
    "Marzec",
    "Kwiecień",
    "Maj",
    "Czerwiec",
    "Lipiec",
    "Sierpień",
    "Wrzesień",
    "Październik",
    "Listopad",
    "Grudzień",
  ],
  monthNamesShort: [
    "Sty.",
    "Lut.",
    "Mar.",
    "Kwi.",
    "Maj",
    "Cze.",
    "Lip.",
    "Sie.",
    "Wrz.",
    "Paź.",
    "Lis.",
    "Gru.",
  ],
  dayNames: [
    "Niedziela",
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota",
  ],
  dayNamesShort: ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"],
  today: "Dzisiaj",
};
LocaleConfig.defaultLocale = "pl";

interface Shift {
  id: string;
  patientName: string;
  caregiverId: string;
  start: Timestamp;
  status: string;
  end?: Timestamp;
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
  const [caregiversMap, setCaregiversMap] = useState<{ [key: string]: string }>(
    {}
  );
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const patientDoc = await getDoc(doc(db, "patients", patientId));
        if (!patientDoc.exists()) {
          Alert.alert("Błąd", "Nie znaleziono podopiecznego.");
          navigation.goBack();
          return;
        }
        const pData = patientDoc.data();
        setPatient({ id: patientDoc.id, ...pData });

        const shiftsQuery = query(
          collection(db, "shifts"),
          where("patientId", "==", patientId),
          orderBy("start", "desc")
        );
        const querySnapshot = await getDocs(shiftsQuery);
        const shiftsData = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Shift)
        );
        setAllShifts(shiftsData);

        const uniqueIds = new Set<string>();
        shiftsData.forEach((s) => {
          if (s.caregiverId) uniqueIds.add(s.caregiverId);
        });
        if (pData.caregiverIds) {
          pData.caregiverIds.forEach((id: string) => uniqueIds.add(id));
        }

        const caregiversData = await Promise.all(
          Array.from(uniqueIds).map(async (id) => {
            const u = await getDoc(doc(db, "users", id));
            return u.exists()
              ? ({ id: u.id, ...u.data() } as CaregiverInfo)
              : { id, name: "Usunięty", email: "" };
          })
        );
        const map: { [key: string]: string } = {};
        caregiversData.forEach(
          (c) => (map[c.id] = c.name || c.email || "Bez nazwy")
        );
        setCaregiversMap(map);
      } catch (error) {
        console.log(error);
      }
      setLoading(false);
    };

    const unsubscribe = navigation.addListener("focus", fetchData);
    return unsubscribe;
  }, [patientId, navigation]);

  const markedDates: any = {};
  allShifts.forEach((shift) => {
    const dateKey = shift.start.toDate().toISOString().split("T")[0];
    markedDates[dateKey] = { marked: true, dotColor: theme.colors.primary };
  });
  markedDates[selectedDate] = {
    ...markedDates[selectedDate],
    selected: true,
    selectedColor: theme.colors.primary,
  };

  const selectedDateShifts = allShifts.filter((shift) => {
    return shift.start.toDate().toISOString().split("T")[0] === selectedDate;
  });
  selectedDateShifts.sort((a, b) => a.start.toMillis() - b.start.toMillis());

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

  const ListHeader = () => (
    <View style={styles.headerContainer}>
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
          {/* PRZYCISK 1: Zaplanuj Wizytę (STYL PRIMARY) */}
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

          {/* PRZYCISK 2: Opiekunowie (TERAZ TEŻ STYL PRIMARY) */}
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() =>
              navigation.navigate("ManageCaregivers", { patientId: patient.id })
            }
          >
            <Text style={styles.buttonPrimaryText}>Opiekunowie</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Calendar
        current={selectedDate}
        onDayPress={(day: any) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        theme={{
          todayTextColor: theme.colors.primary,
          arrowColor: theme.colors.primary,
          dotColor: theme.colors.primary,
          selectedDayBackgroundColor: theme.colors.primary,
        }}
      />
      <Text style={styles.dateHeader}>Wizyty w dniu: {selectedDate}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={selectedDateShifts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.shiftCard}
            onPress={() => {
              if (item.status === "completed") {
                navigation.navigate("ReportDetail", { shiftId: item.id });
              } else {
                navigation.navigate("EditVisit", { shiftId: item.id });
              }
            }}
          >
            <View>
              <Text style={styles.cardTitle}>
                {item.start
                  .toDate()
                  .toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                -
                {item.end
                  ? item.end
                      .toDate()
                      .toLocaleTimeString("pl-PL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                  : ""}
              </Text>
              <Text style={styles.statusText}>
                {item.status === "completed"
                  ? "✅ Zakończona"
                  : "🟡 Zaplanowana"}
              </Text>
            </View>
            <View style={styles.caregiverBadge}>
              <Text style={styles.caregiverText}>
                👤 {caregiversMap[item.caregiverId] || "Nieznany"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Brak wizyt w wybranym dniu.</Text>
        }
        contentContainerStyle={{ paddingBottom: 50 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { justifyContent: "center", alignItems: "center" },
  headerContainer: { marginBottom: 10 },
  header: {
    padding: theme.spacing.large,
    paddingBottom: 5,
    backgroundColor: theme.colors.card,
    elevation: 3,
    alignItems: "center",
    marginBottom: 15,
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
  avatarContainer: { marginBottom: 10, marginTop: 5 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#eee" },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "white", fontSize: 30, fontWeight: "bold" },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 2,
    textAlign: "center",
    color: theme.colors.text,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 15,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
  },

  // STYL GŁÓWNEGO PRZYCISKU (Teraz używany przez oba)
  buttonPrimary: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  buttonPrimaryText: {
    color: theme.colors.primaryText,
    fontWeight: "bold",
    fontSize: 12,
  },

  dateHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    padding: 15,
    backgroundColor: "#f0f0f0",
    marginTop: 10,
  },
  shiftCard: {
    backgroundColor: theme.colors.card,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 1,
  },
  cardTitle: { fontWeight: "bold", fontSize: 16, color: theme.colors.text },
  statusText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
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
