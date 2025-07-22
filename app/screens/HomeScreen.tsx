import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { auth } from "../../firebaseConfig";
import { signOut } from "firebase/auth";

const HomeScreen = () => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("Użytkownik wylogowany!");
    } catch (error) {
      console.error("Błąd podczas wylogowywania:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Witaj w aplikacji!</Text>
      <Text>Jesteś zalogowany.</Text>
      <Button title="Wyloguj się" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
});

export default HomeScreen;
