import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";

interface EmptyStateProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  color?: string;
  // Opcjonalne: dla formularza kodu
  showInput?: boolean;
  inviteCode?: string;
  onCodeChange?: (text: string) => void;
  onAction?: () => void;
  actionLabel?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  color = theme.colors.primary,
  showInput,
  inviteCode,
  onCodeChange,
  onAction,
  actionLabel,
}: EmptyStateProps) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: color + "20" }]}>
            <MaterialCommunityIcons name={icon} size={80} color={color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc}>{description}</Text>

          {showInput && (
            <TextInput
              style={styles.input}
              placeholder="Kod 6-cyfrowy"
              value={inviteCode}
              onChangeText={onCodeChange}
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />
          )}

          {onAction && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: color }]}
              onPress={onAction}
            >
              <Text style={styles.buttonText}>{actionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center", // To naprawia problem z centrowaniem!
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "white",
    width: "100%",
    padding: 30,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: "center",
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 10,
    textAlign: "center",
  },
  desc: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  input: {
    width: "100%",
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 15,
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 5,
    marginBottom: 20,
  },
  button: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
