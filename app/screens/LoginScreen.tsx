import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { theme } from "../../theme";
// 1. Importujemy nasz hook
import { useAlert } from "../context/AlertContext";

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 2. Pobieramy funkcję showAlert
  const { showAlert } = useAlert();

  const handleLogin = async () => {
    if (!email || !password) {
      // 3. Używamy nowej funkcji zamiast Alert.alert
      showAlert("Błąd", "Proszę podać e-mail i hasło.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        showAlert("Błąd logowania", "Nieprawidłowy e-mail lub hasło.");
      } else {
        showAlert("Błąd logowania", "Wystąpił nieoczekiwany błąd.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
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
