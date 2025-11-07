import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView, // 1. Importujemy potrzebne moduły
} from "react-native";
import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { theme } from "../../theme";

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Funkcja handleLogin (bez zmian)
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Błąd", "Proszę podać e-mail i hasło.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
    // 2. Używamy SafeAreaView jako głównego kontenera tła
    <SafeAreaView style={styles.container}>
      {/* 3. Dodajemy KeyboardAvoidingView z behavior="padding" */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        style={styles.kbContainer}
      >
        {/* 4. Dodajemy ScrollView, aby ekran działał na mniejszych telefonach */}
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Zaloguj się</Text>

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
            placeholder="Hasło"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={theme.colors.textSecondary}
          />

          <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin}>
            <Text style={styles.buttonPrimaryText}>Zaloguj się</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => navigation.navigate("RoleSelection")}
          >
            <Text style={styles.buttonSecondaryText}>
              Nie masz konta? Zarejestruj się
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// 5. Aktualizujemy style
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  kbContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1, // Kluczowe: pozwala zawartości rosnąć i centrować się
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
    marginBottom: theme.spacing.medium,
    elevation: 3,
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
