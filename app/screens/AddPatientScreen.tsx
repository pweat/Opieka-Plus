import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { db, auth } from "../../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

const AddPatientScreen = ({ navigation }: { navigation: any }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSaveProfile = async () => {
    // Sprawdzamy, czy pole z imieniem nie jest puste
    if (name.trim() === "") {
      Alert.alert("Błąd", "Proszę podać imię podopiecznego.");
      return;
    }

    // Sprawdzamy, czy użytkownik jest zalogowany
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Błąd", "Nie jesteś zalogowany.");
      return;
    }

    try {
      // 'addDoc' automatycznie stworzy nowy dokument z unikalnym ID
      // w kolekcji 'patients'.
      const docRef = await addDoc(collection(db, "patients"), {
        name: name,
        description: description,
        ownerId: user.uid, // Zapisujemy ID "właściciela" tego profilu!
        createdAt: new Date(),
      });

      console.log("Dokument zapisany z ID: ", docRef.id);
      Alert.alert("Sukces", "Profil podopiecznego został pomyślnie dodany.");
      navigation.goBack(); // Wracamy do poprzedniego ekranu (HomeScreen)
    } catch (error) {
      console.error("Błąd podczas dodawania dokumentu: ", error);
      Alert.alert("Błąd", "Wystąpił błąd podczas zapisu profilu.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nowy profil podopiecznego</Text>
      <TextInput
        style={styles.input}
        placeholder="Imię (np. Babcia Krysia)"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Krótki opis (np. stan zdrowia, ważne informacje)"
        value={description}
        onChangeText={setDescription}
        multiline={true} // Pozwalamy na wpisywanie wielu linii tekstu
      />
      <Button title="Zapisz profil" onPress={handleSaveProfile} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  textArea: {
    height: 100, // Wyższe pole dla opisu
    textAlignVertical: "top", // Zaczynamy pisać od góry
    paddingTop: 10,
  },
});

export default AddPatientScreen;
