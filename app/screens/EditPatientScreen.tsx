import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { db } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";

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

  // 1. Pobierz aktualne dane, aby wypełnić formularz
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

  // 2. Funkcja do zapisania zmian
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
      navigation.goBack(); // Wróć do ekranu szczegółów
    } catch (error) {
      console.error("Błąd podczas aktualizacji: ", error);
      Alert.alert("Błąd", "Wystąpił błąd podczas zapisu.");
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.loadingContainer} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edytuj profil</Text>
      <Text style={styles.label}>Imię:</Text>
      <TextInput
        style={styles.input}
        placeholder="Imię (np. Babcia Krysia)"
        value={name}
        onChangeText={setName}
      />
      <Text style={styles.label}>Opis:</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Krótki opis (np. stan zdrowia, ważne informacje)"
        value={description}
        onChangeText={setDescription}
        multiline={true}
      />
      <View style={styles.buttonContainer}>
        <Button title="Zapisz zmiany" onPress={handleUpdateProfile} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: { fontSize: 16, fontWeight: "500", marginBottom: 5, marginLeft: 5 },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: "white",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  buttonContainer: {
    marginTop: 20,
  },
});

export default EditPatientScreen;
