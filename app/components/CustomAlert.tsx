import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { theme } from "../../theme";

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: {
    text: string;
    onPress?: () => void;
    style?: "cancel" | "destructive" | "default";
  }[];
  onClose: () => void;
}

export const CustomAlert = ({
  visible,
  title,
  message,
  buttons,
  onClose,
}: CustomAlertProps) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            {buttons.map((btn, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  btn.style === "cancel" && styles.buttonCancel,
                  btn.style === "destructive" && styles.buttonDestructive,
                  // Jeśli przycisków jest więcej niż 1, dajemy im marginesy
                  buttons.length > 1 && { flex: 1, marginHorizontal: 5 },
                ]}
                onPress={() => {
                  if (btn.onPress) btn.onPress();
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.buttonText,
                    btn.style === "cancel" && styles.textCancel,
                    btn.style === "destructive" && styles.textDestructive,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Półprzezroczyste tło
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertBox: {
    backgroundColor: theme.colors.card,
    borderRadius: 15,
    padding: 20,
    width: "100%",
    maxWidth: 340,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 25,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  buttonText: {
    color: theme.colors.primaryText,
    fontWeight: "bold",
    fontSize: 16,
  },
  // Style dla przycisku "Anuluj"
  buttonCancel: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  textCancel: {
    color: "#666",
  },
  // Style dla przycisku "Usuń/Destructive"
  buttonDestructive: {
    backgroundColor: "#ffebee",
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  textDestructive: {
    color: "#d32f2f",
  },
});
