import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { theme } from "../../theme";
import {
  doc,
  getDoc,
  collection,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useAlert } from "../context/AlertContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Calendar, LocaleConfig } from "react-native-calendars";

// Konfiguracja języka kalendarza (jeśli jeszcze nie była ustawiona globalnie)
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

const ScheduleVisitScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { patientId, patientName } = route.params;
  const { showAlert } = useAlert();

  // DANE
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [selectedCaregiver, setSelectedCaregiver] = useState<any>(null);

  // KALENDARZ (MULTI-SELECT)
  // Obiekt w formacie: { "2023-11-25": { selected: true, selectedColor: 'blue' } }
  const [selectedDates, setSelectedDates] = useState<any>({});

  // GODZINY (Domyślnie 08:00 - 10:00)
  const [startTime, setStartTime] = useState<Date>(
    new Date(new Date().setHours(8, 0, 0, 0))
  );
  const [endTime, setEndTime] = useState<Date>(
    new Date(new Date().setHours(10, 0, 0, 0))
  );
  const [pickerMode, setPickerMode] = useState<"timeStart" | "timeEnd" | null>(
    null
  );

  // ZADANIA
  const [tasks, setTasks] = useState<string[]>([]);
  const [currentTask, setCurrentTask] = useState("");

  useEffect(() => {
    const fetchCaregivers = async () => {
      const patientDocRef = doc(db, "patients", patientId);
      const patientDoc = await getDoc(patientDocRef);
      if (patientDoc.exists() && patientDoc.data().caregiverIds) {
        const caregiverIds = patientDoc.data().caregiverIds;
        const caregiversData = await Promise.all(
          caregiverIds.map(async (id: string) => {
            const userDoc = await getDoc(doc(db, "users", id));
            return userDoc.exists()
              ? { id: userDoc.id, ...userDoc.data() }
              : null;
          })
        );
        setCaregivers(caregiversData.filter((c) => c !== null));
      }
    };
    fetchCaregivers();
  }, [patientId]);

  // --- OBSŁUGA KALENDARZA (ZAZNACZANIE DNI) ---
  const handleDayPress = (day: any) => {
    const dateStr = day.dateString;
    const newDates = { ...selectedDates };

    if (newDates[dateStr]) {
      // Jeśli już zaznaczona -> Odznaczamy
      delete newDates[dateStr];
    } else {
      // Jeśli nie zaznaczona -> Zaznaczamy
      newDates[dateStr] = {
        selected: true,
        selectedColor: theme.colors.primary,
        selectedTextColor: "white",
      };
    }
    setSelectedDates(newDates);
  };

  // --- OBSŁUGA GODZIN ---
  const handleConfirmTime = (date: Date) => {
    if (pickerMode === "timeStart") setStartTime(date);
    if (pickerMode === "timeEnd") setEndTime(date);
    setPickerMode(null);
  };

  // --- ZADANIA ---
  const addTask = () => {
    if (currentTask.trim()) {
      setTasks([...tasks, currentTask.trim()]);
      setCurrentTask("");
    }
  };
  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  // --- ZAPISYWANIE (HURTOWE) ---
  const handleSave = async () => {
    // Walidacja
    if (!selectedCaregiver) return showAlert("Błąd", "Wybierz opiekuna.");

    const datesList = Object.keys(selectedDates);
    if (datesList.length === 0)
      return showAlert(
        "Błąd",
        "Zaznacz przynajmniej jeden dzień w kalendarzu."
      );

    // Walidacja godzin
    const startH = startTime.getHours();
    const startM = startTime.getMinutes();
    const endH = endTime.getHours();
    const endM = endTime.getMinutes();

    if (endH < startH || (endH === startH && endM <= startM)) {
      return showAlert(
        "Błąd",
        "Godzina zakończenia musi być późniejsza niż startu."
      );
    }

    const ownerId = auth.currentUser?.uid;
    const tasksForDb = tasks.map((t) => ({ description: t, isDone: false }));

    try {
      const batch = writeBatch(db);

      // Iterujemy przez wszystkie zaznaczone daty
      datesList.forEach((dateStr) => {
        // Tworzymy pełne obiekty daty dla konkretnego dnia
        // dateStr to np. "2023-11-25"
        const [year, month, day] = dateStr.split("-").map(Number);

        const sDate = new Date(year, month - 1, day, startH, startM);
        const eDate = new Date(year, month - 1, day, endH, endM);

        const ref = doc(collection(db, "shifts"));
        batch.set(ref, {
          patientId,
          patientName,
          caregiverId: selectedCaregiver.id,
          ownerId,
          start: Timestamp.fromDate(sDate),
          end: Timestamp.fromDate(eDate),
          status: "scheduled",
          tasks: tasksForDb,
        });
      });

      await batch.commit();

      const count = datesList.length;
      showAlert(
        "Sukces",
        `Zaplanowano ${count} ${count === 1 ? "wizytę" : "wizyt"}.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      console.log(e);
      showAlert("Błąd", "Nie udało się zapisać.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* KARTA 1: OPIEKUN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>👤 Kto ma przyjść?</Text>
          <View style={styles.chipsRow}>
            {caregivers.length > 0 ? (
              caregivers.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.chip,
                    selectedCaregiver?.id === c.id && styles.chipActive,
                  ]}
                  onPress={() => setSelectedCaregiver(c)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedCaregiver?.id === c.id && styles.chipTextActive,
                    ]}
                  >
                    {c.name || c.email}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.hint}>
                Brak opiekunów. Dodaj ich w profilu.
              </Text>
            )}
          </View>
        </View>

        {/* KARTA 2: TERMINY (KALENDARZ) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📅 Wybierz dni wizyt</Text>
          <Text style={styles.subHint}>
            Kliknij w dni na kalendarzu, aby je zaznaczyć.
          </Text>

          <Calendar
            onDayPress={handleDayPress}
            markedDates={selectedDates}
            firstDay={1} // Poniedziałek
            theme={{
              selectedDayBackgroundColor: theme.colors.primary,
              selectedDayTextColor: "#ffffff",
              todayTextColor: theme.colors.primary,
              arrowColor: theme.colors.primary,
            }}
            style={styles.calendar}
          />

          <View style={styles.divider} />

          <Text style={styles.labelSmall}>
            Godziny (dla wszystkich wybranych dni):
          </Text>
          <View style={{ flexDirection: "row", gap: 15, marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.inputRow, { flex: 1 }]}
              onPress={() => setPickerMode("timeStart")}
            >
              <MaterialCommunityIcons
                name="clock-outline"
                size={24}
                color="#666"
              />
              <View>
                <Text style={styles.timeLabel}>Początek</Text>
                <Text style={styles.timeText}>
                  {startTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inputRow, { flex: 1 }]}
              onPress={() => setPickerMode("timeEnd")}
            >
              <MaterialCommunityIcons
                name="clock-check-outline"
                size={24}
                color="#666"
              />
              <View>
                <Text style={styles.timeLabel}>Koniec</Text>
                <Text style={styles.timeText}>
                  {endTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* KARTA 3: ZADANIA */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📋 Co jest do zrobienia?</Text>
          <View style={styles.addTaskRow}>
            <TextInput
              style={styles.taskInput}
              placeholder="Np. Podać leki, Spacer..."
              value={currentTask}
              onChangeText={setCurrentTask}
            />
            <TouchableOpacity style={styles.addBtn} onPress={addTask}>
              <MaterialCommunityIcons name="plus" size={24} color="white" />
            </TouchableOpacity>
          </View>
          {tasks.map((t, i) => (
            <View key={i} style={styles.taskItem}>
              <Text style={{ flex: 1, fontSize: 15 }}>{t}</Text>
              <TouchableOpacity onPress={() => removeTask(i)}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color="#ccc"
                />
              </TouchableOpacity>
            </View>
          ))}
          {tasks.length === 0 && <Text style={styles.hint}>Brak zadań.</Text>}
        </View>

        {/* PODSUMOWANIE I ZAPIS */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>
            {Object.keys(selectedDates).length > 0
              ? `Zatwierdź (${Object.keys(selectedDates).length} wizyt)`
              : "Zatwierdź"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <DateTimePickerModal
        isVisible={pickerMode !== null}
        mode="time"
        onConfirm={handleConfirmTime}
        onCancel={() => setPickerMode(null)}
        locale="pl-PL"
        confirmTextIOS="Wybierz"
        cancelTextIOS="Anuluj"
        is24Hour={true}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100 },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  hint: { fontSize: 13, color: "#888", fontStyle: "italic" },
  subHint: { fontSize: 13, color: "#666", marginBottom: 10 },

  // CHIPS
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#eee",
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: { fontSize: 14, color: "#666", fontWeight: "500" },
  chipTextActive: { color: "white" },

  // CALENDAR
  calendar: {
    borderRadius: 10,
    marginBottom: 10,
    borderColor: "#eee",
    borderWidth: 1,
  },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 15 },

  // TIME
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  timeLabel: { fontSize: 11, color: "#888", textTransform: "uppercase" },
  timeText: { fontSize: 18, fontWeight: "bold", color: "#333" },
  labelSmall: { fontSize: 13, fontWeight: "600", color: "#444" },

  // TASKS
  addTaskRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  taskInput: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
  },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f9f9f9",
  },

  // BUTTON
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
  },
  saveBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },
});

export default ScheduleVisitScreen;
