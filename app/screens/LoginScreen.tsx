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
import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
// Importujemy nasz motyw!
import { theme } from "../../theme";

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Błąd", "Proszę podać e-mail i hasło.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Alert o sukcesie został usunięty (zgodnie z Twoją prośbą)
    } catch (error: any) {
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
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Zaloguj się</Text>

      {/* Nowe, stylizowane pole tekstowe */}
      <TextInput
        style={styles.input}
        placeholder="Adres e-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={theme.colors.textSecondary}
      />

      {/* Nowe, stylizowane pole tekstowe */}
      <TextInput
        style={styles.input}
        placeholder="Hasło"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={theme.colors.textSecondary}
      />

      {/* Nasz nowy, główny przycisk */}
      <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin}>
        <Text style={styles.buttonPrimaryText}>Zaloguj się</Text>
      </TouchableOpacity>

      {/* Nasz nowy, dodatkowy przycisk */}
      <TouchableOpacity
        style={styles.buttonSecondary}
        onPress={() => navigation.navigate("RoleSelection")}
      >
        <Text style={styles.buttonSecondaryText}>
          Nie masz konta? Zarejestruj się
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// Nowe style z pliku theme.ts
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
    marginBottom: theme.spacing.large,
  },
  // Styl dla naszych pól tekstowych
  input: {
    backgroundColor: theme.colors.card, // Tło 'karty' (białe)
    borderWidth: 1,
    borderColor: "#ddd", // Delikatna ramka
    borderRadius: 10,
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
    fontSize: theme.fonts.body,
    color: theme.colors.text,
  },
  // Style przycisków (takie same jak na WelcomeScreen)
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: theme.spacing.medium,
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
  buttonSecondary: {
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonSecondaryText: {
    color: theme.colors.primary,
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
});

export default LoginScreen;
