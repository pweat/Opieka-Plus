import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme";
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

  useEffect(() => {
    const fetch = async () => {
      const d = await getDoc(patientDocRef);
      if (d.exists()) {
        setName(d.data().name);
        setDescription(d.data().description);
      }
      setLoading(false);
    };
    fetch();
  }, [patientId]);

  const handleUpdate = async () => {
    if (!name.trim()) return Alert.alert("Błąd", "Podaj imię.");
    await updateDoc(patientDocRef, { name, description });
    Alert.alert("Sukces", "Zaktualizowano.");
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert("Potwierdź", "Usunąć profil trwale?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Usuń",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(patientDocRef);
          navigation.navigate("Home");
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Imię:</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Text style={styles.label}>Opis:</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <TouchableOpacity style={styles.buttonPrimary} onPress={handleUpdate}>
        <Text style={styles.buttonText}>Zapisz zmiany</Text>
      </TouchableOpacity>

      <View style={styles.deleteZone}>
        <TouchableOpacity style={styles.buttonDelete} onPress={handleDelete}>
          <Text style={styles.deleteText}>Usuń profil</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: theme.colors.background },
  label: { fontWeight: "bold", marginBottom: 5, color: theme.colors.text },
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  deleteZone: {
    marginTop: 40,
    borderTopWidth: 1,
    borderColor: "#ddd",
    paddingTop: 20,
  },
  buttonDelete: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "red",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteText: { color: "red", fontWeight: "bold" },
});

export default EditPatientScreen;
