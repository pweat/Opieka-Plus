import React from "react";
import { View, Text, Button, StyleSheet, SafeAreaView } from "react-native";

// Każdy ekran wewnątrz nawigatora otrzymuje specjalny obiekt "navigation"
const WelcomeScreen = ({ navigation }: { navigation: any }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Opieka Plus</Text>
      <Text style={styles.subtitle}>
        Witaj w aplikacji, która ułatwia opiekę.
      </Text>

      <View style={styles.buttonContainer}>
        {/* Używamy navigation.navigate() do przejścia na inny ekran */}
        <Button
          title="Zaloguj się"
          onPress={() => navigation.navigate("Login")}
        />
        <Button
          title="Zarejestruj się"
          onPress={() => navigation.navigate("RoleSelection")}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... style pozostają bez zmian
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: { fontSize: 40, fontWeight: "bold", marginBottom: 16 },
  subtitle: {
    fontSize: 18,
    color: "gray",
    textAlign: "center",
    marginBottom: 50,
  },
  buttonContainer: {},
});

export default WelcomeScreen;
