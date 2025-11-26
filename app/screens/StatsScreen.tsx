import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { theme } from "../../theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Definiujemy, co siedzi w bazie, żeby TS nie krzyczał
interface ShiftData {
  start: Timestamp;
  end: Timestamp;
  caregiverId: string;
  patientId: string;
  patientName: string;
  ownerId: string;
  status: string;
}

interface StatItem {
  id: string;
  name: string;
  totalHours: number;
  visitCount: number;
}

const StatsScreen = ({ navigation }: { navigation: any }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [totalMonthHours, setTotalMonthHours] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [currentDate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      let role = userRole;
      if (!role) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        role = userDoc.exists() ? userDoc.data().role : null;
        setUserRole(role);
      }

      const startOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const endOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      let q;
      if (role === "opiekun_glowny") {
        q = query(
          collection(db, "shifts"),
          where("ownerId", "==", user.uid),
          where("status", "==", "completed")
        );
      } else {
        q = query(
          collection(db, "shifts"),
          where("caregiverId", "==", user.uid),
          where("status", "==", "completed")
        );
      }

      const snapshot = await getDocs(q);
      // TU JEST NAPRAWA: Rzutujemy dane na ShiftData
      const rawShifts = snapshot.docs.map((d) => d.data() as ShiftData);

      const statsMap: { [key: string]: StatItem } = {};
      let monthTotal = 0;

      for (const shift of rawShifts) {
        const start = shift.start.toDate();
        const end = shift.end.toDate();

        if (start >= startOfMonth && start <= endOfMonth) {
          const durationMs = end.getTime() - start.getTime();
          const hours = durationMs / (1000 * 60 * 60);

          monthTotal += hours;

          const groupKey =
            role === "opiekun_glowny" ? shift.caregiverId : shift.patientId;
          const groupName =
            role === "opiekun_glowny" ? "Ładowanie..." : shift.patientName;

          if (!statsMap[groupKey]) {
            statsMap[groupKey] = {
              id: groupKey,
              name: groupName,
              totalHours: 0,
              visitCount: 0,
            };
          }
          statsMap[groupKey].totalHours += hours;
          statsMap[groupKey].visitCount += 1;
        }
      }

      if (role === "opiekun_glowny") {
        const ids = Object.keys(statsMap);
        await Promise.all(
          ids.map(async (id) => {
            if (id === user.uid) {
              statsMap[id].name = "Ty (Opiekun Główny)";
            } else {
              const uDoc = await getDoc(doc(db, "users", id));
              if (uDoc.exists()) {
                const data = uDoc.data();
                statsMap[id].name = data.name || data.email || "Nieznany";
              } else {
                statsMap[id].name = "Usunięty Opiekun";
              }
            }
          })
        );
      }

      setTotalMonthHours(monthTotal);
      setStats(Object.values(statsMap));
    } catch (error) {
      console.log("Błąd statystyk:", error);
    }
    setLoading(false);
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const formatMonth = (date: Date) => {
    const months = [
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
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={() => changeMonth(-1)}
          style={styles.arrowBtn}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={30}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        <Text style={styles.monthText}>{formatMonth(currentDate)}</Text>
        <TouchableOpacity
          onPress={() => changeMonth(1)}
          style={styles.arrowBtn}
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={30}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Łącznie w tym miesiącu:</Text>
        <Text style={styles.totalValue}>{totalMonthHours.toFixed(1)} h</Text>
      </View>

      <Text style={styles.listTitle}>
        {userRole === "opiekun_glowny"
          ? "Godziny wg Opiekunów"
          : "Godziny wg Podopiecznych"}
      </Text>

      <FlatList
        data={stats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.rowCard}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons
                name={
                  userRole === "opiekun_glowny"
                    ? "account-tie"
                    : "account-heart"
                }
                size={24}
                color="white"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemVisits}>{item.visitCount} wizyt(y)</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.itemHours}>
                {item.totalHours.toFixed(1)} h
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Brak zakończonych wizyt w tym miesiącu.
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  monthText: { fontSize: 20, fontWeight: "bold", color: theme.colors.text },
  arrowBtn: { padding: 5 },
  totalCard: {
    backgroundColor: theme.colors.primary,
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 25,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
  },
  totalLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginBottom: 5,
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  totalValue: { color: "white", fontSize: 36, fontWeight: "bold" },
  listTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.textSecondary,
    marginBottom: 10,
    marginLeft: 5,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.textSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  itemName: { fontSize: 16, fontWeight: "bold", color: theme.colors.text },
  itemVisits: { fontSize: 12, color: "#888" },
  itemHours: { fontSize: 18, fontWeight: "bold", color: theme.colors.primary },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 20,
    fontStyle: "italic",
  },
});

export default StatsScreen;
