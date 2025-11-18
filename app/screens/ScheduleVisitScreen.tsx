import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { theme } from "../../theme";
import { doc, getDoc, collection, addDoc, Timestamp } from "firebase/firestore";
import DateTimePickerModal from "react-native-modal-datetime-picker";

const ScheduleVisitScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { patientId, patientName } = route.params;
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [selectedCaregiver, setSelectedCaregiver] = useState<any>(null);
  const [visitDate, setVisitDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isStartTimePickerVisible, setStartTimePickerVisibility] =
    useState(false);
  const [isEndTimePickerVisible, setEndTimePickerVisibility] = useState(false);
  const [tasks, setTasks] = useState<string[]>([]);
  const [currentTask, setCurrentTask] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const d = await getDoc(doc(db, "patients", patientId));
      if (d.exists() && d.data().caregiverIds) {
        const ids = d.data().caregiverIds;
        const data = await Promise.all(
          ids.map(async (id: string) => {
            const u = await getDoc(doc(db, "users", id));
            return u.exists() ? { id: u.id, ...u.data() } : null;
          })
        );
        setCaregivers(data.filter((c) => c !== null));
      }
    };
    fetch();
  }, [patientId]);

  const handleAddTask = () => {
    if (currentTask.trim()) {
      setTasks([...tasks, currentTask.trim()]);
      setCurrentTask("");
    }
  };

  const handleSchedule = async () => {
    if (!selectedCaregiver || !visitDate || !startTime || !endTime)
      return Alert.alert("Błąd", "Uzupełnij dane.");
    try {
      const start = new Date(visitDate);
      start.setHours(startTime.getHours(), startTime.getMinutes());
      const end = new Date(visitDate);
      end.setHours(endTime.getHours(), endTime.getMinutes());

      await addDoc(collection(db, "shifts"), {
        patientId,
        patientName,
        caregiverId: selectedCaregiver.id,
        ownerId: auth.currentUser?.uid,
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
        status: "scheduled",
        tasks: tasks.map((t) => ({ description: t, isDone: false })),
      });
      Alert.alert("Sukces", "Zaplanowano wizytę.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Błąd", "Nie udało się zaplanować.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Wybierz opiekunkę/opiekuna:</Text>
      <View style={styles.pills}>
        {caregivers.map((cg) => (
          <TouchableOpacity
            key={cg.id}
            style={[
              styles.pill,
              selectedCaregiver?.id === cg.id && styles.pillSelected,
            ]}
            onPress={() => setSelectedCaregiver(cg)}
          >
            <Text
              style={[
                styles.pillText,
                selectedCaregiver?.id === cg.id && styles.pillTextSelected,
              ]}
            >
              {cg.name || cg.email}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Data i Czas:</Text>
      <TouchableOpacity
        style={styles.picker}
        onPress={() => setDatePickerVisibility(true)}
      >
        <Text>
          {visitDate ? visitDate.toLocaleDateString("pl-PL") : "Wybierz datę"}
        </Text>
      </TouchableOpacity>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.picker, { flex: 1, marginRight: 5 }]}
          onPress={() => setStartTimePickerVisibility(true)}
        >
          <Text>
            Od:{" "}
            {startTime
              ? startTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.picker, { flex: 1, marginLeft: 5 }]}
          onPress={() => setEndTimePickerVisibility(true)}
        >
          <Text>
            Do:{" "}
            {endTime
              ? endTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--"}
          </Text>
        </TouchableOpacity>
      </View>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={(d) => {
          setVisitDate(d);
          setDatePickerVisibility(false);
        }}
        onCancel={() => setDatePickerVisibility(false)}
      />
      <DateTimePickerModal
        isVisible={isStartTimePickerVisible}
        mode="time"
        onConfirm={(d) => {
          setStartTime(d);
          setStartTimePickerVisibility(false);
        }}
        onCancel={() => setStartTimePickerVisibility(false)}
      />
      <DateTimePickerModal
        isVisible={isEndTimePickerVisible}
        mode="time"
        onConfirm={(d) => {
          setEndTime(d);
          setEndTimePickerVisibility(false);
        }}
        onCancel={() => setEndTimePickerVisibility(false)}
      />

      <Text style={styles.label}>Zadania:</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Treść zadania"
          value={currentTask}
          onChangeText={setCurrentTask}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddTask}>
          <Text style={{ color: "white" }}>Dodaj</Text>
        </TouchableOpacity>
      </View>
      {tasks.map((t, i) => (
        <Text key={i} style={styles.taskItem}>
          • {t}
        </Text>
      ))}

      <TouchableOpacity style={styles.mainBtn} onPress={handleSchedule}>
        <Text style={styles.btnText}>Zaplanuj wizytę</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: theme.colors.background },
  label: {
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
    color: theme.colors.text,
  },
  pills: { flexDirection: "row", flexWrap: "wrap" },
  pill: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    margin: 4,
    backgroundColor: "white",
  },
  pillSelected: { backgroundColor: theme.colors.primary },
  pillText: { color: theme.colors.primary },
  pillTextSelected: { color: "white" },
  picker: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  row: { flexDirection: "row", alignItems: "center" },
  input: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    height: 50,
  },
  addBtn: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    marginLeft: 10,
  },
  taskItem: { padding: 5, fontSize: 16 },
  mainBtn: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 50,
  },
  btnText: { color: "white", fontWeight: "bold" },
});

export default ScheduleVisitScreen;
