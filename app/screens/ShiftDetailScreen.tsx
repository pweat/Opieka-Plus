import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const ShiftDetailScreen = ({ route }: { route: any }) => {
  const { shiftId } = route.params;
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const shiftRef = doc(db, "shifts", shiftId);

  useEffect(() => {
    const fetch = async () => {
      const d = await getDoc(shiftRef);
      if (d.exists()) {
        setShift({ id: d.id, ...d.data() });
        setNotes(d.data().notes || "");
      }
      setLoading(false);
    };
    fetch();
  }, [shiftId]);

  const toggleTask = async (idx: number) => {
    const tasks = [...shift.tasks];
    tasks[idx].isDone = !tasks[idx].isDone;
    setShift({ ...shift, tasks });
    await updateDoc(shiftRef, { tasks });
  };

  const updateField = async (field: string, val: string) => {
    setShift({ ...shift, [field]: val });
    await updateDoc(shiftRef, { [field]: val });
  };

  const saveNotes = async () => {
    await updateDoc(shiftRef, { notes });
    Alert.alert("Sukces", "Zapisano notatki.");
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  if (!shift)
    return (
      <View>
        <Text>Błąd</Text>
      </View>
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <Text style={styles.header}>{shift.patientName}</Text>

        <Text style={styles.title}>Zadania:</Text>
        {shift.tasks?.map((t: any, i: number) => (
          <TouchableOpacity
            key={i}
            style={styles.task}
            onPress={() => toggleTask(i)}
          >
            <Text
              style={{
                fontSize: 18,
                marginRight: 10,
                color: theme.colors.primary,
              }}
            >
              {t.isDone ? "☑" : "☐"}
            </Text>
            <Text
              style={[
                styles.taskText,
                t.isDone && {
                  textDecorationLine: "line-through",
                  color: "gray",
                },
              ]}
            >
              {t.description}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.title}>Nastrój:</Text>
        <View style={styles.row}>
          {["happy", "neutral", "sad"].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.option, shift.mood === m && styles.selected]}
              onPress={() => updateField("mood", m)}
            >
              <Text style={{ fontSize: 30 }}>
                {m === "happy" ? "😄" : m === "neutral" ? "😐" : "😟"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.title}>Energia:</Text>
        <View style={styles.row}>
          {["low", "medium", "high"].map((e) => (
            <TouchableOpacity
              key={e}
              style={[styles.option, shift.energy === e && styles.selected]}
              onPress={() => updateField("energy", e)}
            >
              <Text
                style={[
                  styles.optText,
                  shift.energy === e && { color: "white" },
                ]}
              >
                {e === "low" ? "Mało" : e === "medium" ? "Średnio" : "Dużo"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.title}>Notatki:</Text>
        <TextInput
          style={styles.input}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Wpisz notatki..."
        />
        <TouchableOpacity style={styles.btn} onPress={saveNotes}>
          <Text style={styles.btnText}>Zapisz notatki</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 20 },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "bold", marginTop: 15, marginBottom: 5 },
  task: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 5,
  },
  taskText: { fontSize: 16 },
  row: { flexDirection: "row", justifyContent: "space-around" },
  option: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    minWidth: 80,
    alignItems: "center",
  },
  selected: { backgroundColor: theme.colors.primary },
  optText: { color: theme.colors.primary, fontWeight: "bold" },
  input: {
    backgroundColor: "white",
    height: 100,
    borderRadius: 10,
    padding: 10,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  btn: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "white", fontWeight: "bold" },
});

export default ShiftDetailScreen;
