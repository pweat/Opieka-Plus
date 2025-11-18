import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { theme } from "../../theme";
import { collection, addDoc } from "firebase/firestore";

const AddPatientScreen = ({ navigation }: { navigation: any }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSaveProfile = async () => {
    if (name.trim() === "") return Alert.alert("Błąd", "Podaj imię.");
    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, "patients"), {
        name: name,
        description: description,
        ownerId: user.uid,
        createdAt: new Date(),
      });
      Alert.alert("Sukces", "Dodano podopiecznego.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Błąd", "Wystąpił błąd zapisu.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
        placeholder="np. Stan zdrowia"
        placeholderTextColor={theme.colors.textSecondary}
        value={description}
        onChangeText={setDescription}
        multiline={true}
      />

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
    backgroundColor: theme.colors.background,
    padding: theme.spacing.large,
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
});

export default AddPatientScreen;
