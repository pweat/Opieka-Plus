import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useAlert } from "../context/AlertContext";

const CATEGORIES = [
  {
    id: "doctor",
    label: "Lekarz",
    icon: "👨‍⚕️",
    color: "#E3F2FD",
    borderColor: "#2196F3",
  },
  {
    id: "hospital",
    label: "Szpital",
    icon: "🏥",
    color: "#FFEBEE",
    borderColor: "#F44336",
  },
  {
    id: "meds",
    label: "Leki",
    icon: "💊",
    color: "#E8F5E9",
    borderColor: "#4CAF50",
  },
  {
    id: "other",
    label: "Inne",
    icon: "📝",
    color: "#F5F5F5",
    borderColor: "#9E9E9E",
  },
];

const MedicalHistoryScreen = ({ route }: { route: any }) => {
  const { patientId } = route.params;
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { showAlert } = useAlert();

  // Stan Modala
  const [isModalVisible, setModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  // Pola formularza
  const [editingId, setEditingId] = useState<string | null>(null); // null = dodawanie, string = edycja
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(""); // NOWE POLE
  const [category, setCategory] = useState("doctor");
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "medical_events"),
        where("patientId", "==", patientId),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(q);
      setEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  // Otwieranie modala (Czysty lub z danymi do edycji)
  const openModal = (event?: any) => {
    if (event) {
      // Tryb EDYCJI
      setEditingId(event.id);
      setTitle(event.title);
      setDescription(event.description);
      setLocation(event.location || "");
      setCategory(event.category);
      setDate(event.date.toDate());
    } else {
      // Tryb DODAWANIA
      setEditingId(null);
      setTitle("");
      setDescription("");
      setLocation("");
      setCategory("doctor");
      setDate(new Date());
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showAlert("Błąd", "Wpisz tytuł zdarzenia.");
      return;
    }

    try {
      const eventData = {
        patientId,
        title,
        description,
        location,
        category,
        date: Timestamp.fromDate(date),
        updatedAt: new Date(),
      };

      if (editingId) {
        // Aktualizacja
        await updateDoc(doc(db, "medical_events", editingId), eventData);
        showAlert("Sukces", "Zaktualizowano wpis.");
      } else {
        // Dodawanie
        await addDoc(collection(db, "medical_events"), {
          ...eventData,
          createdAt: new Date(),
        });
        showAlert("Sukces", "Dodano wpis.");
      }

      setModalVisible(false);
      fetchEvents();
    } catch (error) {
      showAlert("Błąd", "Nie udało się zapisać.");
    }
  };

  const handleDelete = (id: string) => {
    showAlert("Usuń", "Czy na pewno chcesz usunąć ten wpis z historii?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Usuń",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "medical_events", id));
            fetchEvents();
          } catch (e) {
            showAlert("Błąd", "Nie udało się usunąć.");
          }
        },
      },
    ]);
  };

  const filteredEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        style={styles.loader}
        color={theme.colors.primary}
      />
    );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="🔍 Szukaj (np. kardiolog)..."
        placeholderTextColor={theme.colors.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const cat =
            CATEGORIES.find((c) => c.id === item.category) || CATEGORIES[3];
          return (
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: cat.color, borderColor: cat.borderColor },
              ]}
              onPress={() => openModal(item)} // Kliknięcie w kartę otwiera edycję
            >
              <View style={styles.cardHeader}>
                <Text style={styles.icon}>{cat.icon}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardDate}>
                    {item.date.toDate().toLocaleDateString("pl-PL")}
                  </Text>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.location ? (
                    <Text style={styles.cardLoc}>📍 {item.location}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Brak wpisów.</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* MODAL */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        {/* POPRAWIONA KLAWIATURA */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalTitle}>
                {editingId ? "Edytuj Zdarzenie" : "Nowe Zdarzenie"}
              </Text>

              <Text style={styles.label}>Data:</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setDatePickerVisibility(true)}
              >
                <Text style={styles.dateText}>
                  {date.toLocaleDateString("pl-PL")}
                </Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={(d) => {
                  setDate(d);
                  setDatePickerVisibility(false);
                }}
                onCancel={() => setDatePickerVisibility(false)}
              />

              <Text style={styles.label}>Kategoria:</Text>
              <View style={styles.catsRow}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.catBtn,
                      category === c.id && {
                        backgroundColor: c.borderColor,
                        borderColor: c.borderColor,
                      },
                    ]}
                    onPress={() => setCategory(c.id)}
                  >
                    <Text
                      style={{
                        fontWeight: category === c.id ? "bold" : "normal",
                        color: category === c.id ? "white" : "black",
                      }}
                    >
                      {c.icon} {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Tytuł:</Text>
              <TextInput
                style={styles.input}
                placeholder="np. Wizyta kontrolna"
                value={title}
                onChangeText={setTitle}
              />

              {/* NOWE POLE */}
              <Text style={styles.label}>Miejsce / Lekarz (opcjonalne):</Text>
              <TextInput
                style={styles.input}
                placeholder="np. Dr. Kowalski, Szpital Miejski"
                value={location}
                onChangeText={setLocation}
              />

              <Text style={styles.label}>Opis / Notatki:</Text>
              <TextInput
                style={[styles.input, { height: 100 }]}
                multiline
                placeholder="Szczegóły, zalecenia..."
                value={description}
                onChangeText={setDescription}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelText}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                  <Text style={styles.saveText}>
                    {editingId ? "Zapisz zmiany" : "Dodaj wpis"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 15 },
  loader: { flex: 1 },
  searchBar: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },

  card: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  icon: { fontSize: 24, marginTop: 2 },
  cardDate: { fontSize: 12, color: "#555", fontWeight: "bold" },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#333", marginTop: 2 },
  cardLoc: {
    fontSize: 13,
    color: theme.colors.primary,
    marginTop: 2,
    fontWeight: "500",
  },
  cardDesc: { marginTop: 8, fontSize: 14, color: "#555" },
  deleteBtn: { padding: 5 },
  deleteIcon: { fontSize: 18 },
  empty: { textAlign: "center", marginTop: 30, color: "#999" },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    backgroundColor: theme.colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  fabText: { color: "white", fontSize: 30, marginTop: -3 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: "85%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: theme.colors.text,
  },
  label: {
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
    color: theme.colors.text,
  },
  dateBtn: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dateText: { fontSize: 16 },
  catsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    marginBottom: 20,
  },
  cancelBtn: { padding: 15, flex: 1, alignItems: "center" },
  cancelText: { color: "gray", fontWeight: "bold", fontSize: 16 },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    marginLeft: 10,
  },
  saveText: { color: "white", fontWeight: "bold", fontSize: 16 },
});

export default MedicalHistoryScreen;
