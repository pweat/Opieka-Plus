import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ShiftDetailScreen = ({ route }: { route: any }) => {
  // Odbieramy ID wizyty (shiftId), które przekażemy z HomeScreen
  const { shiftId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Raport z Wizyty</Text>
      <Text style={styles.info}>
        To jest ekran raportowania dla wizyty o ID:
      </Text>
      <Text style={styles.shiftIdText}>{shiftId}</Text>
      {/* W kolejnych krokach tutaj pojawi się lista zadań i przyciski do raportowania */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  info: {
    fontSize: 16,
    color: "gray",
  },
  shiftIdText: {
    fontSize: 14,
    color: "#333",
    marginTop: 10,
    fontFamily: "monospace", // Używamy czcionki o stałej szerokości, by ID wyglądało jak ID
  },
});

export default ShiftDetailScreen;
