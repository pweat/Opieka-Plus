import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
// Ponownie importujemy 'auth' oraz nową funkcję do logowania
import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";

const LoginScreen = ({ navigation }: { navigation: any }) => {
  // Potrzebujemy "stanu" tylko dla e-maila i hasła
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Funkcja obsługująca logowanie
  const handleLogin = async () => {
    // Prosta walidacja
    if (!email || !password) {
      Alert.alert("Błąd", "Proszę podać e-mail i hasło.");
      return;
    }

    try {
      // Używamy funkcji do logowania, która jest bardzo podobna do tej od rejestracji
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("Zalogowano pomyślnie!", userCredential.user);
      Alert.alert("Sukces!", "Zalogowano pomyślnie!");
      // Na razie po zalogowaniu nic więcej się nie dzieje.
      // W następnym kroku zbudujemy logikę, która przeniesie nas do głównej części aplikacji.
    } catch (error: any) {
      console.error(error);
      // Obsługujemy typowe błędy logowania
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        Alert.alert("Błąd logowania", "Nieprawidłowy e-mail lub hasło.");
      } else {
        Alert.alert("Błąd logowania", "Wystąpił nieoczekiwany błąd.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Zaloguj się</Text>
      <TextInput
        style={styles.input}
        placeholder="Adres e-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Hasło"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Zaloguj się" onPress={handleLogin} />
      {/* Przycisk do nawigacji na ekran rejestracji dla nowych użytkowników */}
      <Button
        title="Nie masz konta? Zarejestruj się"
        onPress={() => navigation.navigate("Register")}
        color="gray" // Zmieniamy kolor, aby odróżnić go od głównej akcji
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
});

export default LoginScreen;
