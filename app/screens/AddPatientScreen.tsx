import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  SafeAreaView, // Użyjemy SafeAreaView
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { theme } from "../../theme"; // Pamiętamy o poprawnej ścieżce
import { collection, addDoc } from "firebase/firestore";
import { TouchableOpacity } from "react-native"; // Użyjemy lepszego TouchableOpacity

const AddPatientScreen = ({ navigation }: { navigation: any }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSaveProfile = async () => {
    if (name.trim() === "") {
      Alert.alert("Błąd", "Proszę podać imię podopiecznego.");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Błąd", "Nie jesteś zalogowany.");
      return;
    }

    try {
      await addDoc(collection(db, "patients"), {
        name: name,
        description: description,
        ownerId: user.uid,
        createdAt: new Date(),
      });

      Alert.alert("Sukces", "Profil podopiecznego został pomyślnie dodany.");
      navigation.goBack();
    } catch (error) {
      console.error("Błąd podczas dodawania dokumentu: ", error);
      Alert.alert("Błąd", "Wystąpił błąd podczas zapisu profilu.");
    }
  };

  return (
    // Używamy SafeAreaView z tłem z motywu
    <SafeAreaView style={styles.container}>
      {/* Tytuł nie jest nam potrzebny, ponieważ ekran będzie miał 
        nagłówek z nawigacji (ten, który ustawiliśmy w AppNavigator.tsx)
      */}

      <Text style={styles.label}>Imię podopiecznego:</Text>
      <TextInput
        style={styles.input}
        placeholder="np. Babcia Krysia"
        placeholderTextColor={theme.colors.textSecondary}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Krótki opis:</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="np. Stan zdrowia, ważne informacje"
        placeholderTextColor={theme.colors.textSecondary}
        value={description}
        onChangeText={setDescription}
        multiline={true}
      />

      {/* Nasz nowy, brązowy przycisk */}
      <TouchableOpacity
        style={styles.buttonPrimary}
        onPress={handleSaveProfile}
      >
        <Text style={styles.buttonPrimaryText}>Zapisz profil</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Tło z motywu
    padding: theme.spacing.large,
  },
  label: {
    fontSize: theme.fonts.body,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
  },
  input: {
    backgroundColor: theme.colors.card, // Białe tło
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
    fontSize: theme.fonts.body,
    color: theme.colors.text,
  },
  textArea: {
    height: 120, // Wyższe pole
    textAlignVertical: "top", // Zaczynamy pisać od góry
    paddingTop: theme.spacing.medium,
  },
  // Style przycisków (takie same jak na WelcomeScreen)
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
    marginTop: theme.spacing.small,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonPrimaryText: {
    color: theme.colors.primaryText,
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
});

export default AddPatientScreen;
