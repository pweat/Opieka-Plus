import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
// 1. Importujemy nasz nowy motyw!
import { theme } from "../../theme";

// (navigation jest przekazywane automatycznie przez React Navigation)
const WelcomeScreen = ({ navigation }: { navigation: any }) => {
  return (
    // 2. Używamy SafeAreaView i nadajemy mu kolor tła z motywu
    <SafeAreaView style={styles.container}>
      {/* 3. Używamy czcionek i kolorów z motywu */}
      <Text style={styles.title}>Opieka Plus</Text>
      <Text style={styles.subtitle}>
        Witaj w aplikacji, która ułatwia opiekę.
      </Text>

      <View style={styles.buttonsWrapper}>
        {/* 4. Zastępujemy <Button> własnym, pięknym przyciskiem */}
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.buttonPrimaryText}>Zaloguj się</Text>
        </TouchableOpacity>

        {/* 5. Tworzymy drugi, "lżejszy" przycisk */}
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => navigation.navigate("RoleSelection")}
        >
          <Text style={styles.buttonSecondaryText}>Zarejestruj się</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// 6. Przebudowujemy CAŁY arkusz stylów, aby używał 'theme'
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Używamy koloru tła z motywu
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.large, // Używamy odstępów z motywu
  },
  title: {
    fontSize: theme.fonts.title, // Używamy czcionki z motywu
    fontWeight: "bold",
    color: theme.colors.text, // Używamy koloru tekstu z motywu
    marginBottom: theme.spacing.medium,
  },
  subtitle: {
    fontSize: theme.fonts.subtitle,
    color: theme.colors.textSecondary, // Używamy koloru drugorzędnego
    textAlign: "center",
    marginBottom: theme.spacing.large * 2, // Większy odstęp
  },
  buttonsWrapper: {
    width: "100%",
  },
  // Styl dla naszego głównego, brązowego przycisku
  buttonPrimary: {
    backgroundColor: theme.colors.primary, // Główny kolor (brąz)
    paddingVertical: theme.spacing.medium,
    borderRadius: 10, // Zaokrąglone rogi
    alignItems: "center",
    marginBottom: theme.spacing.medium,
    // Delikatny cień
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonPrimaryText: {
    color: theme.colors.primaryText, // Tekst na przycisku (biały)
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
  // Styl dla drugiego przycisku (bez tła)
  buttonSecondary: {
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonSecondaryText: {
    color: theme.colors.primary, // Kolor tekstu (brąz)
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
});

export default WelcomeScreen;
