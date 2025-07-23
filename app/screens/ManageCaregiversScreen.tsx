import React from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const ManageCaregiversScreen = ({ route }: { route: any }) => {
  const { patientId } = route.params;

  const generateInviteCode = async () => {
    // Generujemy prosty, 6-cyfrowy kod numeryczny
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      // Zapisujemy zaproszenie w nowej kolekcji "invitations"
      await addDoc(collection(db, "invitations"), {
        code: code,
        patientId: patientId,
        status: "pending", // Status 'oczekujące'
        createdAt: serverTimestamp(), // Data utworzenia
        // Można dodać datę wygaśnięcia, np. za 24h
      });

      Alert.alert(
        "Wygenerowano Kod Zaproszenia",
        `Przekaż ten kod opiekunowi: ${code}\n\nKod jest ważny przez 24 godziny.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Błąd generowania kodu: ", error);
      Alert.alert("Błąd", "Nie udało się wygenerować kodu zaproszenia.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Opiekunowie tego profilu</Text>
      {/* W przyszłości będzie tu lista przypisanych opiekunów */}
      <Text style={styles.emptyText}>Brak przypisanych opiekunów.</Text>
      <Button title="Zaproś nowego Opiekuna" onPress={generateInviteCode} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  emptyText: { color: "gray", fontStyle: "italic", marginBottom: 20 },
});

export default ManageCaregiversScreen;
