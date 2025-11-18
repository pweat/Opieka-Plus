import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme";
import { doc, getDoc } from "firebase/firestore";

const ReportDetailScreen = ({ route }: { route: any }) => {
  const { shiftId } = route.params;
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<any>(null);

  useEffect(() => {
    getDoc(doc(db, "shifts", shiftId)).then((d) => {
      if (d.exists()) setShift({ id: d.id, ...d.data() });
      setLoading(false);
    });
  }, [shiftId]);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  if (!shift) return <Text>Błąd</Text>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{shift.patientName}</Text>
      <Text style={styles.date}>
        {shift.start.toDate().toLocaleString("pl-PL")}
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>
          Nastrój:{" "}
          {shift.mood === "happy"
            ? "😄 Dobry"
            : shift.mood === "sad"
            ? "😟 Słaby"
            : "😐 Neutralny"}
        </Text>
        <Text style={styles.label}>
          Energia:{" "}
          {shift.energy === "high"
            ? "⚡ Duża"
            : shift.energy === "low"
            ? "🔋 Mała"
            : "Medium"}
        </Text>
      </View>

      <Text style={styles.title}>Zadania:</Text>
      {shift.tasks?.map((t: any, i: number) => (
        <View key={i} style={styles.task}>
          <Text style={{ marginRight: 10 }}>{t.isDone ? "✅" : "❌"}</Text>
          <Text
            style={{ textDecorationLine: t.isDone ? "line-through" : "none" }}
          >
            {t.description}
          </Text>
        </View>
      ))}

      <Text style={styles.title}>Notatki:</Text>
      <View style={styles.card}>
        <Text>{shift.notes || "Brak notatek"}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 20 },
  header: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  date: { textAlign: "center", color: "gray", marginBottom: 20 },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  label: { fontSize: 18, marginBottom: 5 },
  title: { fontSize: 18, fontWeight: "bold", marginTop: 10, marginBottom: 5 },
  task: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    marginBottom: 5,
    borderRadius: 5,
  },
});

export default ReportDetailScreen;
