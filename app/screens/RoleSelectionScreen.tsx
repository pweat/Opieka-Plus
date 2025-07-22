import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";

const RoleSelectionScreen = ({ navigation }: { navigation: any }) => {
  // Funkcja nawigująca do ekranu rejestracji i przekazująca parametr z wybraną rolą
  const selectRole = (role: "opiekun_glowny" | "opiekun") => {
    navigation.navigate("Register", { selectedRole: role });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kim jesteś?</Text>
      <View style={styles.button}>
        <Button
          title="Jestem Opiekunem Głównym"
          onPress={() => selectRole("opiekun_glowny")}
        />
      </View>
      <View style={styles.button}>
        <Button
          title="Jestem Opiekunem / Opiekunką"
          onPress={() => selectRole("opiekun")}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 30 },
  button: { width: "100%", marginVertical: 10 },
});

export default RoleSelectionScreen;
