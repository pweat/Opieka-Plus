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
import { useAlert } from "../context/AlertContext";

interface Task {
  description: string;
  isDone: boolean;
}
interface DrinkLog {
  type: string;
  amount: number;
}
interface ShiftDetails {
  id: string;
  patientName: string;
  tasks: Task[];
  notes?: string;
  status?: string;
  moods?: string[];
  strength?: string;
  cognition?: number;
  energy?: "low" | "medium" | "high";
  toiletUrine?: boolean;
  toiletBowel?: boolean;
  sleepLogs?: string[];
  intakeLogs?: DrinkLog[];
  foodContent?: string;
  appetite?: "bad" | "normal" | "good";
  drinkAmount?: number;
}

const MOOD_OPTIONS = [
  "Zadowolona",
  "Smutna",
  "Gadatliwa",
  "Zamyślona",
  "Senna",
  "Agresywna",
  "Spokojna",
];

const ShiftDetailScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { shiftId } = route.params;
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [shift, setShift] = useState<ShiftDetails | null>(null);
  const { showAlert } = useAlert();

  const [notes, setNotes] = useState("");
  const [foodContent, setFoodContent] = useState("");
  const [newNap, setNewNap] = useState("");
  const [drinkType, setDrinkType] = useState("");

  const shiftDocRef = doc(db, "shifts", shiftId);

  useEffect(() => {
    const fetchShiftDetails = async () => {
      setLoading(true);
      try {
        const shiftDoc = await getDoc(shiftDocRef);
        if (shiftDoc.exists()) {
          const data = shiftDoc.data();

          // === AUTOMATYCZNA ZMIANA STATUSU NA "W TOKU" ===
          if (data.status === "scheduled") {
            await updateDoc(shiftDocRef, { status: "in_progress" });
            data.status = "in_progress"; // Aktualizujemy lokalnie
          }

          setShift({
            id: shiftDoc.id,
            patientName: data.patientName,
            tasks: data.tasks || [],
            status: data.status,
            moods: data.moods || [],
            strength: data.strength || "Średnia",
            cognition: data.cognition || 5,
            energy: data.energy,
            toiletUrine: data.toiletUrine || false,
            toiletBowel: data.toiletBowel || false,
            appetite: data.appetite || "normal",
            sleepLogs: data.sleepLogs || [],
            intakeLogs: data.intakeLogs || [],
            notes: data.notes || "",
            foodContent: data.foodContent || "",
          });
          setNotes(data.notes || "");
          setFoodContent(data.foodContent || "");
        } else {
          showAlert("Błąd", "Nie można znaleźć wizyty.", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
        }
      } catch (error) {
        showAlert("Błąd", "Problem z pobraniem danych.");
      }
      setLoading(false);
    };
    fetchShiftDetails();
  }, [shiftId]);

  const updateField = async (field: keyof ShiftDetails, value: any) => {
    if (!shift) return;
    setShift((prev) => ({ ...prev!, [field]: value }));
    try {
      await updateDoc(shiftDocRef, { [field]: value });
    } catch (e) {}
  };

  const toggleTask = async (index: number) => {
    if (!shift) return;
    const newTasks = [...shift.tasks];
    newTasks[index].isDone = !newTasks[index].isDone;
    updateField("tasks", newTasks);
  };

  const toggleMood = (mood: string) => {
    if (!shift) return;
    let newMoods = shift.moods || [];
    if (newMoods.includes(mood)) {
      newMoods = newMoods.filter((m) => m !== mood);
    } else {
      newMoods = [...newMoods, mood];
    }
    updateField("moods", newMoods);
  };

  const addNap = () => {
    if (newNap.trim() === "") return;
    const updatedNaps = [...(shift?.sleepLogs || []), newNap.trim()];
    updateField("sleepLogs", updatedNaps);
    setNewNap("");
  };
  const removeNap = (index: number) => {
    const updatedNaps = (shift?.sleepLogs || []).filter((_, i) => i !== index);
    updateField("sleepLogs", updatedNaps);
  };

  const addDrink = (amount: number) => {
    const type = drinkType.trim() || "Woda";
    const newEntry = { type, amount };
    const updatedDrinks = [...(shift?.intakeLogs || []), newEntry];
    updateField("intakeLogs", updatedDrinks);
  };
  const removeDrink = (index: number) => {
    const updatedDrinks = (shift?.intakeLogs || []).filter(
      (_, i) => i !== index
    );
    updateField("intakeLogs", updatedDrinks);
  };

  const saveTextInputs = async () => {
    try {
      await updateDoc(shiftDocRef, { notes, foodContent });
    } catch (e) {
      console.log("Błąd zapisu");
    }
  };

  const handleFinishShift = () => {
    showAlert("Zakończyć wizytę?", "Czy na pewno uzupełniłaś wszystkie dane?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Zakończ",
        onPress: async () => {
          setIsSaving(true);
          try {
            await updateDoc(shiftDocRef, {
              status: "completed",
              notes,
              foodContent,
            });
            navigation.goBack();
          } catch (error) {
            setIsSaving(false);
            Alert.alert("Błąd", "Nie udało się zakończyć.");
          }
        },
      },
    ]);
  };

  if (loading || isSaving)
    return (
      <ActivityIndicator
        size="large"
        style={styles.loader}
        color={theme.colors.primary}
      />
    );
  if (!shift) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.kbContainer}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerName}>{shift.patientName}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Zadania do wykonania</Text>
          {shift.tasks.length > 0 ? (
            shift.tasks.map((t, i) => (
              <TouchableOpacity
                key={i}
                style={styles.taskRow}
                onPress={() => toggleTask(i)}
              >
                <View
                  style={[styles.checkbox, t.isDone && styles.checkboxActive]}
                >
                  {t.isDone && <Text style={styles.checkMark}>✔</Text>}
                </View>
                <Text
                  style={[
                    styles.taskText,
                    t.isDone && { color: theme.colors.textSecondary },
                  ]}
                >
                  {t.description}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Brak zadań.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💪 Siła i Kojarzenie</Text>
          <Text style={styles.label}>Siła fizyczna:</Text>
          <View style={styles.segmentRow}>
            {["Słaba", "Średnia", "Dobra"].map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.segmentBtn,
                  shift.strength === s && styles.segmentBtnActive,
                ]}
                onPress={() => updateField("strength", s)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    shift.strength === s && styles.segmentTextActive,
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Kojarzenie (1-10):</Text>
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              {[1, 2, 3, 4, 5].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.numberBtn,
                    shift.cognition === num && styles.numberBtnActive,
                  ]}
                  onPress={() => updateField("cognition", num)}
                >
                  <Text
                    style={[
                      styles.numberText,
                      shift.cognition === num && styles.numberTextActive,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.gridRow}>
              {[6, 7, 8, 9, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.numberBtn,
                    shift.cognition === num && styles.numberBtnActive,
                  ]}
                  onPress={() => updateField("cognition", num)}
                >
                  <Text
                    style={[
                      styles.numberText,
                      shift.cognition === num && styles.numberTextActive,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚽 Toaleta i Sen</Text>
          <View style={styles.rowSpread}>
            <TouchableOpacity
              style={[
                styles.bigToggle,
                shift.toiletUrine && styles.bigToggleActive,
              ]}
              onPress={() => updateField("toiletUrine", !shift.toiletUrine)}
            >
              <Text style={styles.bigToggleIcon}>💧</Text>
              <Text
                style={[
                  styles.bigToggleText,
                  shift.toiletUrine && { color: "white" },
                ]}
              >
                Siku
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.bigToggle,
                shift.toiletBowel && styles.bigToggleActive,
              ]}
              onPress={() => updateField("toiletBowel", !shift.toiletBowel)}
            >
              <Text style={styles.bigToggleIcon}>💩</Text>
              <Text
                style={[
                  styles.bigToggleText,
                  shift.toiletBowel && { color: "white" },
                ]}
              >
                Kupa
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Drzemki:</Text>
          <View style={styles.addItemRow}>
            <TextInput
              style={[styles.inputSmall, { flex: 1 }]}
              placeholder="np. 14:00 - 14:30"
              value={newNap}
              onChangeText={setNewNap}
            />
            <TouchableOpacity style={styles.addBtnSmall} onPress={addNap}>
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          {shift.sleepLogs?.map((nap, i) => (
            <View key={i} style={styles.logItem}>
              <Text style={styles.logText}>😴 {nap}</Text>
              <TouchableOpacity onPress={() => removeNap(i)}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ Jedzenie i Picie</Text>
          <Text style={styles.label}>Co zjedzono?</Text>
          <TextInput
            style={styles.inputSmall}
            placeholder="np. Zupa pomidorowa"
            value={foodContent}
            onChangeText={setFoodContent}
            onBlur={saveTextInputs}
          />

          <Text style={styles.label}>Apetyt:</Text>
          {/* POPRAWIONE STYLE APETYTU */}
          <View style={styles.appetiteRow}>
            <TouchableOpacity
              style={[
                styles.emojiBtn,
                shift.appetite === "bad" && styles.emojiBtnActive,
              ]}
              onPress={() => updateField("appetite", "bad")}
            >
              <Text style={styles.emoji}>🤢</Text>
              <Text style={styles.emojiLabel}>Słaby</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.emojiBtn,
                shift.appetite === "normal" && styles.emojiBtnActive,
              ]}
              onPress={() => updateField("appetite", "normal")}
            >
              <Text style={styles.emoji}>😐</Text>
              <Text style={styles.emojiLabel}>Średni</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.emojiBtn,
                shift.appetite === "good" && styles.emojiBtnActive,
              ]}
              onPress={() => updateField("appetite", "good")}
            >
              <Text style={styles.emoji}>😋</Text>
              <Text style={styles.emojiLabel}>Dobry</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nawodnienie (dodaj ilość):</Text>
          <TextInput
            style={styles.inputSmall}
            placeholder="Rodzaj napoju (np. Woda)"
            value={drinkType}
            onChangeText={setDrinkType}
          />
          <View style={styles.rowCenter}>
            <TouchableOpacity
              style={styles.drinkBtn}
              onPress={() => addDrink(0.25)}
            >
              <Text style={styles.drinkBtnText}>+ 1/4</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.drinkBtn}
              onPress={() => addDrink(0.5)}
            >
              <Text style={styles.drinkBtnText}>+ 1/2</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.drinkBtn}
              onPress={() => addDrink(1.0)}
            >
              <Text style={styles.drinkBtnText}>+ 1</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 10 }}>
            {shift.intakeLogs?.map((log, i) => (
              <View key={i} style={styles.logItem}>
                <Text style={styles.logText}>
                  🥛 {log.type}: {log.amount} szkl.
                </Text>
                <TouchableOpacity onPress={() => removeDrink(i)}>
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧠 Nastrój</Text>
          <View style={styles.tagsContainer}>
            {MOOD_OPTIONS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.tag,
                  shift.moods?.includes(m) && styles.tagActive,
                ]}
                onPress={() => toggleMood(m)}
              >
                <Text
                  style={[
                    styles.tagText,
                    shift.moods?.includes(m) && styles.tagTextActive,
                  ]}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Dodatkowe uwagi</Text>
          <TextInput
            style={styles.inputArea}
            placeholder="Inne ważne informacje..."
            multiline
            value={notes}
            onChangeText={setNotes}
            onBlur={saveTextInputs}
          />
        </View>

        <View style={{ height: 20 }} />
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinishShift}>
          <Text style={styles.finishBtnText}>✅ ZAKOŃCZ WIZYTĘ</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  kbContainer: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  scrollContent: { padding: 15, paddingBottom: 50 },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  headerName: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    color: theme.colors.text,
    marginBottom: 15,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.colors.text,
    marginTop: 10,
    marginBottom: 5,
  },
  taskRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: { backgroundColor: theme.colors.primary },
  checkMark: { color: "white", fontSize: 14, fontWeight: "bold" },
  taskText: { fontSize: 16, color: theme.colors.text, flex: 1 },
  emptyText: { color: "#999", fontStyle: "italic" },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  segmentBtnActive: { backgroundColor: "white", elevation: 2 },
  segmentText: { color: "#666", fontWeight: "500" },
  segmentTextActive: { color: theme.colors.primary, fontWeight: "bold" },
  gridContainer: { marginTop: 5 },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  numberBtn: {
    width: "18%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  numberBtnActive: { backgroundColor: theme.colors.primary },
  numberText: { color: "#666", fontWeight: "bold", fontSize: 16 },
  numberTextActive: { color: "white" },
  rowSpread: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  bigToggle: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  bigToggleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  bigToggleIcon: { fontSize: 24, marginBottom: 5 },
  bigToggleText: { fontWeight: "bold", color: theme.colors.text },
  inputSmall: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    marginBottom: 5,
  },
  inputArea: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  addItemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  addBtnSmall: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnText: { color: "white", fontSize: 20, fontWeight: "bold" },
  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  logText: { fontSize: 14, color: theme.colors.text },
  deleteText: { color: "red", fontWeight: "bold", paddingHorizontal: 5 },

  // POPRAWIONE STYLE DLA APETYTU
  appetiteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  emojiBtn: {
    alignItems: "center",
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#f9f9f9",
  },
  emojiBtnActive: { backgroundColor: "#eef6fc", borderColor: "#bce0ff" },
  emoji: { fontSize: 30, marginBottom: 5 },
  emojiLabel: { fontSize: 12, color: "#666", fontWeight: "bold" },

  rowCenter: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 5,
  },
  drinkBtn: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  drinkBtnText: { color: theme.colors.primary, fontWeight: "bold" },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  tagActive: { backgroundColor: theme.colors.primary },
  tagText: { color: "#555" },
  tagTextActive: { color: "white", fontWeight: "bold" },
  finishBtn: {
    backgroundColor: "#2e7d32",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
    elevation: 4,
  },
  finishBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },
});

export default ShiftDetailScreen;
