import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { theme } from "../../theme";
import { MaterialCommunityIcons } from "@expo/vector-icons"; // Import ikon

const WelcomeScreen = ({ navigation }: { navigation: any }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.background}
      />

      {/* GÓRA: Logo i Teksty */}
      <View style={styles.contentContainer}>
        {/* Dekoracyjne koło w tle */}
        <View style={styles.logoCircle}>
          <MaterialCommunityIcons
            name="hand-heart"
            size={80}
            color={theme.colors.primary}
          />
        </View>

        <Text style={styles.title}>Opieka Plus</Text>
        <Text style={styles.subtitle}>
          Spokój dla Ciebie,{"\n"}troska dla Twoich bliskich.
        </Text>
      </View>

      {/* DÓŁ: Przyciski */}
      <View style={styles.buttonsWrapper}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.buttonPrimaryText}>Zaloguj się</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => navigation.navigate("RoleSelection")}
        >
          <Text style={styles.buttonSecondaryText}>Utwórz nowe konto</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Wersja 1.3</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "space-between", // Rozpycha górę i dół
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.large,
  },
  // Nowe style dla "logo"
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "white", // Białe koło na beżowym tle
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.large,
    // Cień
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  title: {
    fontSize: 36, // Większa czcionka
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 24, // Większy odstęp między liniami tekstu
  },
  buttonsWrapper: {
    padding: theme.spacing.large,
    paddingBottom: 40, // Odstęp od dolnej krawędzi ekranu
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16, // Wyższe przyciski są wygodniejsze
    borderRadius: 12,
    alignItems: "center",
    marginBottom: theme.spacing.medium,
    elevation: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  buttonPrimaryText: {
    color: theme.colors.primaryText,
    fontSize: 18, // Większy tekst
    fontWeight: "bold",
  },
  buttonSecondary: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "white", // Biały przycisk zamiast przezroczystego
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  buttonSecondaryText: {
    color: theme.colors.text, // Ciemny tekst dla kontrastu
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    textAlign: "center",
    color: "#ccc",
    fontSize: 12,
    marginTop: 20,
  },
});

export default WelcomeScreen;
