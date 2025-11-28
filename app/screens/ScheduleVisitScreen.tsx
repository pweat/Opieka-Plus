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
  Switch,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { theme } from "../../theme";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useAlert } from "../context/AlertContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Calendar, LocaleConfig } from "react-native-calendars";
// Importujemy funkcję do wysyłania
import { sendPushNotification } from "../utils/notifications";

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
  const [selectedDates, setSelectedDates] = useState<any>({});

  // GODZINY
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

  const handleDayPress = (day: any) => {
    const dateStr = day.dateString;
    const newDates = { ...selectedDates };
    if (newDates[dateStr]) delete newDates[dateStr];
    else
      newDates[dateStr] = {
        selected: true,
        selectedColor: theme.colors.primary,
        selectedTextColor: "white",
      };
    setSelectedDates(newDates);
  };

  const handleConfirmTime = (date: Date) => {
    if (pickerMode === "timeStart") setStartTime(date);
    if (pickerMode === "timeEnd") setEndTime(date);
    setPickerMode(null);
  };

  const addTask = () => {
    if (currentTask.trim()) {
      setTasks([...tasks, currentTask.trim()]);
      setCurrentTask("");
    }
  };
  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  // --- ZAPISYWANIE I POWIADOMIENIA ---
  const handleSave = async () => {
    if (!selectedCaregiver) return showAlert("Błąd", "Wybierz opiekuna.");
    const datesList = Object.keys(selectedDates);
    if (datesList.length === 0) return showAlert("Błąd", "Zaznacz dni.");

    const startH = startTime.getHours();
    const startM = startTime.getMinutes();
    const endH = endTime.getHours();
    const endM = endTime.getMinutes();
    if (endH < startH || (endH === startH && endM <= startM))
      return showAlert("Błąd", "Godziny się nie zgadzają.");

    const ownerId = auth.currentUser?.uid;
    const tasksForDb = tasks.map((t) => ({ description: t, isDone: false }));

    try {
      const batch = writeBatch(db);
      datesList.forEach((dateStr) => {
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

      // --- WYSYŁANIE POWIADOMIENIA DO OPIEKUNA ---
      if (selectedCaregiver.pushToken) {
        await sendPushNotification(
          selectedCaregiver.pushToken,
          "Nowe wizyty w grafiku 📅",
          `Dodano ${datesList.length} nowych wizyt do Twojego harmonogramu.`
        );
      }

      showAlert("Sukces", `Zaplanowano ${datesList.length} wizyt.`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
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
              <Text style={styles.hint}>Brak opiekunów.</Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📅 Wybierz dni wizyt</Text>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={selectedDates}
            firstDay={1}
            theme={{
              selectedDayBackgroundColor: theme.colors.primary,
              todayTextColor: theme.colors.primary,
              arrowColor: theme.colors.primary,
            }}
            style={styles.calendar}
          />
          <View style={styles.divider} />
          <Text style={styles.labelSmall}>Godziny (dla wszystkich dni):</Text>
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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📋 Co jest do zrobienia?</Text>
          <View style={styles.addTaskRow}>
            <TextInput
              style={styles.taskInput}
              placeholder="Np. Podać leki..."
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
        </View>

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
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  hint: { fontSize: 13, color: "#888", fontStyle: "italic" },
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
  calendar: {
    borderRadius: 10,
    marginBottom: 10,
    borderColor: "#eee",
    borderWidth: 1,
  },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 15 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  timeLabel: { fontSize: 11, color: "#888", textTransform: "uppercase" },
  timeText: { fontSize: 18, fontWeight: "bold", color: "#333" },
  labelSmall: { fontSize: 13, fontWeight: "600", color: "#444" },
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
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
  },
  saveBtnText: { color: "white", fontSize: 18, fontWeight: "bold" },
});

export default ScheduleVisitScreen;
