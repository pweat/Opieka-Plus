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

      <View style={styles.buttonsWrapper}>
        <View style={styles.buttonContainer}>
          <Button
            title="Zaloguj się"
            onPress={() => navigation.navigate("Login")}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Zarejestruj się"
            onPress={() => navigation.navigate("RoleSelection")}
          />
        </View>
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
  buttonsWrapper: {
    // Nowy styl dla całego bloku przycisków
    width: "90%",
  },
  buttonContainer: {
    // Zmieniony styl
    marginVertical: 8, // Dodaje 8 jednostek marginesu na górze i na dole
  },
});

export default WelcomeScreen;
