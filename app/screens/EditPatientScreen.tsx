import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Platform, // Dodajemy TouchableOpacity
} from "react-native";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme"; // Pamiętamy o poprawnej ścieżce
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

const EditPatientScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { patientId } = route.params;

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const patientDocRef = doc(db, "patients", patientId);

  // Pobieranie danych (bez zmian)
  useEffect(() => {
    const fetchPatientData = async () => {
      setLoading(true);
      try {
        const docSnap = await getDoc(patientDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name);
          setDescription(data.description);
        } else {
          Alert.alert("Błąd", "Nie znaleziono podopiecznego.");
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert("Błąd", "Nie udało się pobrać danych.");
      }
      setLoading(false);
    };
    fetchPatientData();
  }, [patientId]);

  // Funkcja aktualizacji (bez zmian)
  const handleUpdateProfile = async () => {
    if (name.trim() === "") {
      Alert.alert("Błąd", "Imię nie może być puste.");
      return;
    }
    try {
      await updateDoc(patientDocRef, {
        name: name,
        description: description,
      });
      Alert.alert("Sukces", "Profil podopiecznego został zaktualizowany.");
      navigation.goBack();
    } catch (error) {
      console.error("Błąd podczas aktualizacji: ", error);
      Alert.alert("Błąd", "Wystąpił błąd podczas zapisu.");
    }
  };

  // Funkcja usuwania (bez zmian)
  const handleDeleteProfile = () => {
    Alert.alert(
      "Potwierdź usunięcie",
      `Czy na pewno chcesz trwale usunąć profil ${name}? Tej akcji nie można cofnąć.`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(patientDocRef);
              Alert.alert("Sukces", "Profil podopiecznego został usunięty.");
              navigation.navigate("Home");
            } catch (error) {
              console.error("Błąd podczas usuwania: ", error);
              Alert.alert("Błąd", "Nie udało się usunąć profilu.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Usunęliśmy tytuł, bo jest w nagłówku nawigacji */}

      <Text style={styles.label}>Imię:</Text>
      <TextInput
        style={styles.input}
        placeholder="Imię podopiecznego"
        placeholderTextColor={theme.colors.textSecondary}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Opis:</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Krótki opis"
        placeholderTextColor={theme.colors.textSecondary}
        value={description}
        onChangeText={setDescription}
        multiline={true}
      />

      {/* Przycisk "Zapisz zmiany" w nowym stylu */}
      <TouchableOpacity
        style={styles.buttonPrimary}
        onPress={handleUpdateProfile}
      >
        <Text style={styles.buttonPrimaryText}>Zapisz zmiany</Text>
      </TouchableOpacity>

      {/* Sekcja usuwania w nowym stylu */}
      <View style={styles.deleteZone}>
        <TouchableOpacity
          style={styles.buttonDelete}
          onPress={handleDeleteProfile}
        >
          <Text style={styles.buttonDeleteText}>Usuń ten profil</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.large,
    backgroundColor: theme.colors.background, // Tło z motywu
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: theme.fonts.body,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
    fontSize: theme.fonts.body,
    color: theme.colors.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: theme.spacing.medium,
  },
  // Styl głównego przycisku
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
    marginTop: theme.spacing.small,
    elevation: 3,
  },
  buttonPrimaryText: {
    color: theme.colors.primaryText,
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
  // Style dla sekcji usuwania
  deleteZone: {
    marginTop: theme.spacing.large * 2,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: theme.spacing.large,
  },
  deleteLabel: {
    fontSize: theme.fonts.subtitle,
    color: "red",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: theme.spacing.medium,
  },
  // Styl dla przycisku usuwania
  buttonDelete: {
    backgroundColor: theme.colors.card, // Białe tło
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "red", // Czerwona ramka
  },
  buttonDeleteText: {
    color: "red", // Czerwony tekst
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
});

export default EditPatientScreen;
