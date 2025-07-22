import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
// Importujemy nasze skonfigurowane 'auth' z Firebase oraz funkcję do tworzenia użytkownika
import { auth } from "../../firebaseConfig"; // Zwróć uwagę na '../../' - wychodzimy dwa poziomy wyżej z folderu /app/screens
import { createUserWithEmailAndPassword } from "firebase/auth";

const RegisterScreen = ({ navigation }: { navigation: any }) => {
  // Tworzymy "stan" (pudełka w pamięci) do przechowywania wartości z pól tekstowych.
  // Za każdym razem, gdy użytkownik coś wpisze, będziemy aktualizować te zmienne.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Funkcja, która zostanie wywołana po naciśnięciu przycisku "Zarejestruj"
  const handleRegister = async () => {
    // 1. Prosta walidacja danych
    if (!email || !password || !confirmPassword) {
      Alert.alert("Błąd", "Wszystkie pola są wymagane.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Błąd", "Hasła nie są takie same.");
      return;
    }

    // 2. Próba utworzenia użytkownika w Firebase
    try {
      // Używamy funkcji z biblioteki Firebase, przekazując jej nasz obiekt 'auth' oraz dane użytkownika
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      // Jeśli się udało, userCredential zawiera informacje o nowym użytkowniku
      console.log("Użytkownik zarejestrowany!", userCredential.user);
      Alert.alert("Sukces!", "Konto zostało pomyślnie utworzone.");
      // Przekierowujemy użytkownika na ekran logowania
      navigation.navigate("Login");
    } catch (error: any) {
      // 3. Obsługa błędów z Firebase
      console.error(error);
      // Firebase zwraca przydatne komunikaty błędów, które możemy pokazać użytkownikowi
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
    <View style={styles.container}>
      <Text style={styles.title}>Stwórz nowe konto</Text>

      {/* TextInput to pole do wpisywania tekstu */}
      <TextInput
        style={styles.input}
        placeholder="Adres e-mail"
        value={email} // Wartość pola jest powiązana z naszym stanem 'email'
        onChangeText={setEmail} // Każda zmiana w polu aktualizuje stan 'email'
        keyboardType="email-address" // Pokazuje klawiaturę zoptymalizowaną pod e-mail
        autoCapitalize="none" // Wyłącza automatyczne wielkie litery
      />
      <TextInput
        style={styles.input}
        placeholder="Hasło (min. 6 znaków)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry // Ukrywa wpisywany tekst (wyświetla kropki)
      />
      <TextInput
        style={styles.input}
        placeholder="Potwierdź hasło"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <Button title="Zarejestruj się" onPress={handleRegister} />
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

export default RegisterScreen;
