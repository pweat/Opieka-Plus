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
import { db, auth } from "../../firebaseConfig";
import { theme } from "../../theme";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAlert } from "../context/AlertContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// === INTERFEJSY ===
interface Task {
  description: string;
  isDone: boolean;
}
interface DrinkLog {
  type: string;
  amount: number;
}
interface FoodLog {
  time: string;
  description: string;
}

interface ShiftDetails {
  id: string;
  patientName: string;
  ownerId?: string;
  caregiverId?: string;
  tasks: Task[];
  notes?: string;
  status?: string;
  moods?: string[];
  moodNote?: string;
  strength?: string;
  cognition?: number;
  energy?: "low" | "medium" | "high";
  toiletUrine?: boolean;
  toiletBowel?: boolean;
  sleepLogs?: string[];
  intakeLogs?: DrinkLog[];
  foodLogs?: FoodLog[];
  appetite?: "bad" | "normal" | "good";
}

const DEFAULT_MOOD_OPTIONS = [
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
  const [userRole, setUserRole] = useState<"opiekun_glowny" | "opiekun" | null>(
    null
  );
  const { showAlert } = useAlert();

  // Formularze
  const [notes, setNotes] = useState("");
  const [moodNote, setMoodNote] = useState("");
  const [newNap, setNewNap] = useState("");
  const [drinkType, setDrinkType] = useState("");
  const [newFoodDesc, setNewFoodDesc] = useState("");
  const [newFoodTime, setNewFoodTime] = useState("");
  const [availableMoods, setAvailableMoods] =
    useState<string[]>(DEFAULT_MOOD_OPTIONS);
  const [customMood, setCustomMood] = useState("");

  const shiftDocRef = doc(db, "shifts", shiftId);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let role: any = null;
        if (currentUser) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            role = userDoc.data().role;
            setUserRole(role);
          }
        }

        const shiftDoc = await getDoc(shiftDocRef);
        if (shiftDoc.exists()) {
          const data = shiftDoc.data();
          // USUNIĘTO AUTO-START WIZYTY!

          const savedMoods = data.moods || [];
          const mergedMoods = Array.from(
            new Set([...DEFAULT_MOOD_OPTIONS, ...savedMoods])
          );
          setAvailableMoods(mergedMoods);

          setShift({
            id: shiftDoc.id,
            patientName: data.patientName,
            ownerId: data.ownerId,
            caregiverId: data.caregiverId,
            tasks: data.tasks || [],
            status: data.status,
            moods: savedMoods,
            moodNote: data.moodNote || "",
            strength: data.strength || "Średnia",
            cognition: data.cognition || 5,
            energy: data.energy,
            toiletUrine: data.toiletUrine || false,
            toiletBowel: data.toiletBowel || false,
            appetite: data.appetite || "normal",
            sleepLogs: data.sleepLogs || [],
            intakeLogs: data.intakeLogs || [],
            foodLogs: data.foodLogs || [],
            notes: data.notes || "",
          });

          setNotes(data.notes || "");
          setMoodNote(data.moodNote || "");
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
    fetchData();
  }, [shiftId]);

  // === ROZPOCZYNANIE WIZYTY ===
  const handleStartShift = async () => {
    setIsSaving(true);
    try {
      await updateDoc(shiftDocRef, { status: "in_progress" });
      setShift((prev) => (prev ? { ...prev, status: "in_progress" } : null));
      showAlert("Wizyta rozpoczęta", "Możesz teraz uzupełniać raport.");
    } catch (e) {
      showAlert("Błąd", "Nie udało się rozpocząć wizyty.");
    }
    setIsSaving(false);
  };

  // === HELPERY DO EDYCJI ===
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

  // ... (Reszta funkcji pomocniczych bez zmian: toggleMood, addDrink, addFood itd.)
  // SKROCONO DLA CZYTELNOŚCI - WKLEJ TUTAJ FUNKCJE toggleMood, addNap, removeNap, addDrink, removeDrink, addFood, removeFood, saveTextInputs Z POPRZEDNIEGO PLIKU
  // Poniżej wklejam je ponownie dla pewności:

  const toggleMood = (mood: string) => {
    if (!shift) return;
    let newMoods = shift.moods || [];
    if (newMoods.includes(mood)) newMoods = newMoods.filter((m) => m !== mood);
    else newMoods = [...newMoods, mood];
    updateField("moods", newMoods);
  };
  const addCustomMood = () => {
    if (customMood.trim() === "") return;
    const moodToAdd = customMood.trim();
    if (!availableMoods.includes(moodToAdd))
      setAvailableMoods((prev) => [...prev, moodToAdd]);
    toggleMood(moodToAdd);
    setCustomMood("");
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
  const addFood = () => {
    if (newFoodDesc.trim() === "")
      return showAlert("Uwaga", "Wpisz co zostało zjedzone.");
    const time =
      newFoodTime.trim() ||
      new Date().toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    const newEntry: FoodLog = { time, description: newFoodDesc.trim() };
    const updatedFood = [...(shift?.foodLogs || []), newEntry];
    updateField("foodLogs", updatedFood);
    setNewFoodDesc("");
    setNewFoodTime("");
  };
  const removeFood = (index: number) => {
    const updatedFood = (shift?.foodLogs || []).filter((_, i) => i !== index);
    updateField("foodLogs", updatedFood);
  };
  const saveTextInputs = async () => {
    try {
      await updateDoc(shiftDocRef, { notes, moodNote });
    } catch (e) {}
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
              moodNote,
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

  const handleDeleteShift = () => {
    showAlert(
      "Usuń wizytę",
      "Czy na pewno chcesz usunąć tę wizytę? To jest nieodwracalne.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: async () => {
            setIsSaving(true);
            try {
              await deleteDoc(shiftDocRef);
              navigation.goBack();
            } catch (error) {
              setIsSaving(false);
              showAlert("Błąd", "Nie udało się usunąć.");
            }
          },
        },
      ]
    );
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

  const isOwner = userRole === "opiekun_glowny";
  const isScheduled = shift.status === "scheduled";

  // === WIDOK STARTOWY DLA OPIEKUNKI (BLOKADA) ===
  if (!isOwner && isScheduled) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MaterialCommunityIcons
          name="calendar-clock"
          size={80}
          color={theme.colors.primary}
        />
        <Text style={styles.startTitle}>Wizyta Zaplanowana</Text>
        <Text style={styles.startSub}>Pacjent: {shift.patientName}</Text>

        <View style={styles.startCard}>
          <Text style={styles.startLabel}>Zadania do wykonania:</Text>
          {shift.tasks.length > 0 ? (
            shift.tasks.map((t, i) => (
              <Text key={i} style={styles.startTaskItem}>
                • {t.description}
              </Text>
            ))
          ) : (
            <Text style={{ color: "#888" }}>Brak zadań</Text>
          )}
        </View>

        <TouchableOpacity style={styles.startButton} onPress={handleStartShift}>
          <Text style={styles.startButtonText}>ROZPOCZNIJ WIZYTĘ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 20 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: "#666" }}>Wróć</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

        {/* BANER DLA SZEFA (Status) */}
        {isOwner && isScheduled && (
          <View style={styles.infoBanner}>
            <MaterialCommunityIcons
              name="eye-outline"
              size={20}
              color="#1565C0"
            />
            <Text style={styles.infoText}>
              Tryb podglądu. Oczekiwanie na rozpoczęcie przez opiekuna.
            </Text>
          </View>
        )}

        {/* --- ZADANIA --- */}
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
                    t.isDone && {
                      color: theme.colors.textSecondary,
                      textDecorationLine: "line-through",
                    },
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

        {/* --- SIŁA I KOJARZENIE --- */}
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
            {[...Array(10).keys()]
              .map((i) => i + 1)
              .reduce((rows: any[], key, index) => {
                if (index % 5 === 0) rows.push([]);
                rows[rows.length - 1].push(key);
                return rows;
              }, [])
              .map((row: number[], rowIndex: number) => (
                <View key={rowIndex} style={styles.gridRow}>
                  {row.map((num) => (
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
              ))}
          </View>
        </View>

        {/* --- TOALETA I SEN --- */}
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
              placeholder="Godziny (np. 14:00 - 14:30)"
              value={newNap}
              onChangeText={setNewNap}
            />
            <TouchableOpacity style={styles.addBtnSmall} onPress={addNap}>
              <MaterialCommunityIcons name="plus" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.listContainer}>
            {shift.sleepLogs?.map((nap, i) => (
              <View key={i} style={styles.cardItem}>
                <View style={styles.cardContentRow}>
                  <MaterialCommunityIcons
                    name="bed-clock"
                    size={20}
                    color="#7B1FA2"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.cardText}>{nap}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeNap(i)}
                  style={styles.trashBtn}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={20}
                    color="#FF5252"
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* --- JEDZENIE I PICIE --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ Jedzenie i Picie</Text>
          <Text style={styles.label}>Apetyt:</Text>
          <View style={styles.appetiteRow}>
            {[
              { k: "bad", i: "🤢", l: "Słaby" },
              { k: "normal", i: "😐", l: "Średni" },
              { k: "good", i: "😋", l: "Dobry" },
            ].map((ap: any) => (
              <TouchableOpacity
                key={ap.k}
                style={[
                  styles.emojiBtn,
                  shift.appetite === ap.k && styles.emojiBtnActive,
                ]}
                onPress={() => updateField("appetite", ap.k)}
              >
                <Text style={styles.emoji}>{ap.i}</Text>
                <Text style={styles.emojiLabel}>{ap.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Posiłki:</Text>
          <View style={styles.addItemRow}>
            <TextInput
              style={[styles.inputSmall, { width: 80, marginRight: 5 }]}
              placeholder="Godz."
              value={newFoodTime}
              onChangeText={setNewFoodTime}
            />
            <TextInput
              style={[styles.inputSmall, { flex: 1 }]}
              placeholder="Co zjedzono?"
              value={newFoodDesc}
              onChangeText={setNewFoodDesc}
            />
            <TouchableOpacity style={styles.addBtnSmall} onPress={addFood}>
              <MaterialCommunityIcons name="plus" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.listContainer}>
            {shift.foodLogs?.map((food, i) => (
              <View key={i} style={styles.cardItem}>
                <View style={styles.cardContentRow}>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeText}>{food.time}</Text>
                  </View>
                  <Text style={[styles.cardText, { flex: 1, marginLeft: 10 }]}>
                    {food.description}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeFood(i)}
                  style={styles.trashBtn}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={20}
                    color="#FF5252"
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <Text style={styles.label}>Nawodnienie (dodaj ilość):</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <TextInput
              style={[styles.inputSmall, { flex: 1, marginBottom: 0 }]}
              placeholder="Rodzaj (np. Woda)"
              value={drinkType}
              onChangeText={setDrinkType}
            />
          </View>
          <View style={styles.rowCenter}>
            {[0.25, 0.5, 1.0].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={styles.drinkBtn}
                onPress={() => addDrink(amt)}
              >
                <Text style={styles.drinkBtnText}>+ {amt} szkl.</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.listContainer}>
            {shift.intakeLogs?.map((log, i) => (
              <View key={i} style={styles.cardItem}>
                <View style={styles.cardContentRow}>
                  <MaterialCommunityIcons
                    name="cup-water"
                    size={20}
                    color="#1976D2"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.cardText}>
                    <Text style={{ fontWeight: "bold" }}>{log.type}</Text>:{" "}
                    {log.amount} szkl.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeDrink(i)}
                  style={styles.trashBtn}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={20}
                    color="#FF5252"
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* --- NASTRÓJ --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧠 Nastrój</Text>
          <View style={styles.addItemRow}>
            <TextInput
              style={[styles.inputSmall, { flex: 1 }]}
              placeholder="Inny nastrój? Dodaj..."
              value={customMood}
              onChangeText={setCustomMood}
            />
            <TouchableOpacity
              style={styles.addBtnSmall}
              onPress={addCustomMood}
            >
              <MaterialCommunityIcons name="plus" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.tagsContainer}>
            {availableMoods.map((m) => (
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
          <TextInput
            style={[styles.inputArea, { marginTop: 15, minHeight: 60 }]}
            placeholder="Dodatkowy opis nastroju..."
            multiline
            value={moodNote}
            onChangeText={setMoodNote}
            onBlur={saveTextInputs}
          />
        </View>

        {/* --- UWAGI --- */}
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

        {/* PRZYCISK KOŃCZENIA (TYLKO DLA OPIEKUNA) */}
        {!isOwner && (
          <TouchableOpacity
            style={styles.finishBtn}
            onPress={handleFinishShift}
          >
            <Text style={styles.finishBtnText}>✅ ZAKOŃCZ WIZYTĘ</Text>
          </TouchableOpacity>
        )}

        {/* PRZYCISK USUWANIA (TYLKO DLA SZEFA) */}
        {isOwner && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteShift}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={20}
              color="#ff5252"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.deleteBtnText}>Usuń wizytę</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 30 }} />
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
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  // START SCREEN STYLES
  startTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 5,
  },
  startSub: { fontSize: 16, color: "#666", marginBottom: 30 },
  startCard: {
    backgroundColor: "white",
    width: "100%",
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 30,
  },
  startLabel: {
    fontWeight: "bold",
    marginBottom: 10,
    color: theme.colors.primary,
  },
  startTaskItem: { fontSize: 15, color: "#444", marginBottom: 5 },
  startButton: {
    backgroundColor: "#4CAF50",
    width: "100%",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    elevation: 5,
  },
  startButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 1,
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
    marginBottom: 8,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#1565C0",
  },
  infoText: { marginLeft: 10, color: "#1565C0", fontSize: 13, flex: 1 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f9f9f9",
  },
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
  addItemRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  addBtnSmall: {
    backgroundColor: theme.colors.primary,
    width: 46,
    height: 46,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: { marginTop: 5 },
  cardItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 1,
  },
  cardContentRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  cardText: { fontSize: 15, color: "#333" },
  trashBtn: { padding: 5 },
  emptyListText: {
    color: "#bbb",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 5,
  },
  timeBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 5,
  },
  timeText: { color: "#1976D2", fontWeight: "bold", fontSize: 12 },
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
    marginBottom: 10,
  },
  drinkBtn: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  drinkBtnText: {
    color: theme.colors.primary,
    fontWeight: "bold",
    fontSize: 12,
  },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 5,
  },
  tagActive: { backgroundColor: theme.colors.primary },
  tagText: { color: "#555", fontWeight: "500" },
  tagTextActive: { color: "white", fontWeight: "bold" },
  finishBtn: {
    backgroundColor: "#2e7d32",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    elevation: 4,
  },
  finishBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },
  deleteBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ffcdd2",
    backgroundColor: "#ffebee",
  },
  deleteBtnText: { color: "#ff5252", fontWeight: "bold", fontSize: 16 },
});

export default ShiftDetailScreen;
