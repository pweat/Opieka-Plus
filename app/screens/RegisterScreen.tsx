import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
// Importujemy bazę danych, motyw i funkcje autoryzacji
import { auth, db } from "../../firebaseConfig";
import { theme } from "../../theme"; // Poprawna ścieżka to ../theme
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

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
      // Krok 1: Utwórz użytkownika w Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Krok 2: Zapisz rolę w Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: selectedRole,
        createdAt: new Date(),
      });

      // Nie musimy już nawigować, RootNavigator sam wykryje zalogowanie
      Alert.alert("Sukces!", "Konto zostało pomyślnie utworzone.");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Błąd", "Ten adres email jest już zajęty.");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Błąd", "Hasło jest zbyt słabe (min. 6 znaków).");
      } else {
        Alert.alert("Błąd rejestracji", error.message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Stwórz konto</Text>
      <Text style={styles.subtitle}>
        Jako:{" "}
        {selectedRole === "opiekun_glowny"
          ? "Opiekun Główny"
          : "Opiekun / Opiekunka"}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Adres e-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={theme.colors.textSecondary}
      />
      <TextInput
        style={styles.input}
        placeholder="Hasło (min. 6 znaków)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={theme.colors.textSecondary}
      />
      <TextInput
        style={styles.input}
        placeholder="Potwierdź hasło"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholderTextColor={theme.colors.textSecondary}
      />

      {/* Przycisk "Zarejestruj się" */}
      <TouchableOpacity style={styles.buttonPrimary} onPress={handleRegister}>
        <Text style={styles.buttonPrimaryText}>Zarejestruj się</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// Style z pliku theme.ts
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    padding: theme.spacing.large,
  },
  title: {
    fontSize: theme.fonts.title,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.small, // Mniejszy margines
  },
  subtitle: {
    fontSize: theme.fonts.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.large,
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
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
    marginTop: theme.spacing.small, // Mały margines nad przyciskiem
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

export default RegisterScreen;
