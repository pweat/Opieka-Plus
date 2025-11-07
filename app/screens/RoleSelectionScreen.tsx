import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
// Importujemy nasz motyw!
import { theme } from "../../theme";

const RoleSelectionScreen = ({ navigation }: { navigation: any }) => {
  const selectRole = (role: "opiekun_glowny" | "opiekun") => {
    navigation.navigate("Register", { selectedRole: role });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Kim jesteś?</Text>
      <Text style={styles.subtitle}>
        Wybierz swoją rolę, abyśmy mogli dopasować aplikację do Twoich potrzeb.
      </Text>

      {/* Używamy naszych nowych przycisków */}
      <TouchableOpacity
        style={styles.buttonPrimary}
        onPress={() => selectRole("opiekun_glowny")}
      >
        <Text style={styles.buttonPrimaryText}>Jestem Opiekunem Głównym</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonPrimary}
        onPress={() => selectRole("opiekun")}
      >
        <Text style={styles.buttonPrimaryText}>
          Jestem Opiekunem / Opiekunką
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
    marginBottom: theme.spacing.medium,
  },
  subtitle: {
    fontSize: theme.fonts.body, // Używamy mniejszej czcionki 'body'
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.large * 2,
  },
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
});

export default RoleSelectionScreen;
