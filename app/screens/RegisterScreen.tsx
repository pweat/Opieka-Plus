import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { theme } from "../../theme";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
// 1. Importujemy hook
import { useAlert } from "../context/AlertContext";

const RegisterScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { selectedRole } = route.params;

  // 2. Używamy hooka
  const { showAlert } = useAlert();

  const handleRegister = async () => {
    if (!name || !email || !password || password !== confirmPassword) {
      // 3. Podmieniamy alerty
      showAlert(
        "Błąd",
        "Sprawdź, czy wszystkie pola są wypełnione i czy hasła są identyczne."
      );
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: user.email,
        role: selectedRole,
        createdAt: new Date(),
      });

      showAlert("Sukces!", "Konto zostało pomyślnie utworzone.");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        showAlert("Błąd", "Ten adres email jest już zajęty.");
      } else if (error.code === "auth/weak-password") {
        showAlert("Błąd", "Hasło jest zbyt słabe (min. 6 znaków).");
      } else {
        showAlert("Błąd rejestracji", error.message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Stwórz konto</Text>
          <Text style={styles.subtitle}>
            Jako:{" "}
            {selectedRole === "opiekun_glowny"
              ? "Opiekun Główny"
              : "Opiekun / Opiekunka"}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Twoje Imię"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholderTextColor={theme.colors.textSecondary}
          />
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

          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={handleRegister}
          >
            <Text style={styles.buttonPrimaryText}>Zarejestruj się</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: theme.spacing.large,
  },
  title: {
    fontSize: theme.fonts.title,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.small,
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
    marginTop: theme.spacing.small,
    elevation: 3,
  },
  buttonPrimaryText: {
    color: theme.colors.primaryText,
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
});

export default RegisterScreen;
