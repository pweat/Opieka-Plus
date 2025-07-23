import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
// Dodajemy importy z Firestore
import { auth, db } from "../../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; // Import funkcji do zapisu w bazie

// Modyfikujemy definicję, aby przyjmowała "route" - tam będzie nasza rola
const RegisterScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Odbieramy wybraną rolę przekazaną z poprzedniego ekranu
  const { selectedRole } = route.params;

  const handleRegister = async () => {
    if (!email || !password || password !== confirmPassword) {
      Alert.alert(
        "Błąd",
        "Sprawdź, czy wszystkie pola są wypełnione i czy hasła są identyczne."
      );
      return;
    }

    try {
      // Krok 1: Utwórz użytkownika w Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Krok 2: Zapisz dodatkowe informacje o użytkowniku w Firestore
      // Tworzymy dokument w kolekcji "users" o ID takim samym jak UID użytkownika z Auth
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: selectedRole, // Zapisujemy wybraną rolę!
        createdAt: new Date(), // Zapisujemy datę utworzenia konta
      });

      Alert.alert("Sukces!", "Konto zostało pomyślnie utworzone.");
      //navigation.navigate("Login");
    } catch (error: any) {
      // ... obsługa błędów pozostaje bez zmian
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Błąd", "Ten adres email jest już zajęty.");
      } else if (error.code === "auth/weak-password") {
        Alert.alert(
          "Błąd",
          "Hasło jest zbyt słabe. Powinno mieć co najmniej 6 znaków."
        );
      } else {
        Alert.alert("Błąd rejestracji", error.message);
      }
    }
  };

  return (
    // ... cała reszta komponentu (TextInputy, Button) pozostaje bez zmian
    <View style={styles.container}>
      <Text style={styles.title}>
        Stwórz konto jako{" "}
        {selectedRole === "opiekun_glowny" ? "Opiekun Główny" : "Opiekun"}
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Adres e-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Hasło (min. 6 znaków)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Potwierdź hasło"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <View style={styles.buttonContainer}>
        <Button title="Zarejestruj się" onPress={handleRegister} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... style bez zmian
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
    textAlign: "center",
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
  buttonContainer: {
    width: "100%",
    marginTop: 10,
  },
});

export default RegisterScreen;
