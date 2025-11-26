import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { auth, db, storage } from "../../firebaseConfig"; // Zakładam, że masz 'storage' w firebaseConfig
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  updatePassword,
  deleteUser,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { theme } from "../../theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAlert } from "../context/AlertContext";
import * as ImagePicker from "expo-image-picker";

const UserProfileScreen = ({ navigation }: { navigation: any }) => {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Stany sekcji (Accordion)
  const [isPasswordExpanded, setIsPasswordExpanded] = useState(false);
  const [isDeleteExpanded, setIsDeleteExpanded] = useState(false);

  // Hasła
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const { showAlert } = useAlert();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const docRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUser(data);
        setName(data.name || "");
      }
    }
  };

  // --- UPLOAD ZDJĘCIA ---
  const pickImage = async () => {
    // Pytamy o uprawnienia
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert(
        "Błąd",
        "Potrzebujemy dostępu do galerii, aby zmienić zdjęcie."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!auth.currentUser) return;
    setUploading(true);
    try {
      // Blob hack dla Expo + Firebase
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `avatars/${auth.currentUser.uid}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      // Zapisz URL w Firestore
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        photoURL: url,
      });
      setUser({ ...user, photoURL: url });
    } catch (e) {
      showAlert("Błąd", "Nie udało się wgrać zdjęcia.");
      console.log(e);
    }
    setUploading(false);
  };

  // --- RESZTA FUNKCJI (BEZ ZMIAN) ---
  const handleUpdateProfile = async () => {
    if (name.trim() === "")
      return showAlert("Błąd", "Imię nie może być puste.");
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser!.uid), {
        name: name.trim(),
      });
      showAlert("Sukces", "Profil zaktualizowany.");
    } catch (error) {
      showAlert("Błąd", "Nie udało się zapisać.");
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (
      currentPassword === "" ||
      newPassword.length < 6 ||
      newPassword !== confirmNewPassword
    ) {
      return showAlert(
        "Błąd",
        "Sprawdź dane (hasło min. 6 znaków, zgodność haseł)."
      );
    }
    setLoading(true);
    try {
      const cred = EmailAuthProvider.credential(
        auth.currentUser!.email!,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser!, cred);
      await updatePassword(auth.currentUser!, newPassword);
      showAlert("Sukces", "Hasło zmienione. Zaloguj się ponownie.", [
        { text: "OK", onPress: () => signOut(auth) },
      ]);
    } catch (e) {
      showAlert("Błąd", "Nieudana zmiana hasła.");
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (deletePassword === "") return showAlert("Błąd", "Podaj hasło.");
    showAlert("Potwierdź", "To operacja nieodwracalna.", [
      { text: "Usuń", onPress: performDelete },
      { text: "Anuluj" },
    ]);
  };

  const performDelete = async () => {
    setLoading(true);
    try {
      const cred = EmailAuthProvider.credential(
        auth.currentUser!.email!,
        deletePassword
      );
      await reauthenticateWithCredential(auth.currentUser!, cred);
      await deleteDoc(doc(db, "users", auth.currentUser!.uid));
      await deleteUser(auth.currentUser!);
    } catch (e) {
      showAlert("Błąd", "Błędne hasło lub błąd sieci.");
    }
    setLoading(false);
  };

  const handleLogout = () => {
    showAlert("Wylogowanie", "Czy na pewno?", [
      { text: "Tak", onPress: () => signOut(auth) },
      { text: "Nie" },
    ]);
  };

  if (!user) return <ActivityIndicator style={styles.center} />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage} disabled={uploading}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {name ? name.charAt(0).toUpperCase() : "U"}
                </Text>
              </View>
            )}
            <View style={styles.camIcon}>
              {uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <MaterialCommunityIcons name="camera" size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.role}>
            {user.role === "opiekun_glowny" ? "Opiekun Główny" : "Opiekun"}
          </Text>
        </View>

        {/* SEKCJA DANE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Twoje Dane</Text>
          <Text style={styles.label}>Imię i Nazwisko</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Np. Jan Kowalski"
          />
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleUpdateProfile}
            disabled={loading}
          >
            <Text style={styles.btnText}>Zapisz zmiany</Text>
          </TouchableOpacity>
        </View>

        {/* SEKCJA ZMIANA HASŁA (ROZWIJANA) */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setIsPasswordExpanded(!isPasswordExpanded)}
          >
            <Text style={styles.sectionTitle}>Zmiana Hasła</Text>
            <MaterialCommunityIcons
              name={isPasswordExpanded ? "chevron-up" : "chevron-down"}
              size={24}
              color="#666"
            />
          </TouchableOpacity>

          {isPasswordExpanded && (
            <View style={{ marginTop: 15 }}>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Obecne hasło"
              />
              <TextInput
                style={styles.input}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nowe hasło (min. 6 znaków)"
              />
              <TextInput
                style={styles.input}
                secureTextEntry
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="Powtórz nowe hasło"
              />
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={handleChangePassword}
                disabled={loading}
              >
                <Text style={styles.btnTextSecondary}>Zmień hasło</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* SEKCJA USUWANIE KONTA (ROZWIJANA - CZERWONA) */}
        <View style={[styles.section, styles.dangerSection]}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setIsDeleteExpanded(!isDeleteExpanded)}
          >
            <Text style={[styles.sectionTitle, { color: "#c62828" }]}>
              Usuwanie Konta
            </Text>
            <MaterialCommunityIcons
              name={isDeleteExpanded ? "chevron-up" : "chevron-down"}
              size={24}
              color="#c62828"
            />
          </TouchableOpacity>

          {isDeleteExpanded && (
            <View style={{ marginTop: 15 }}>
              <Text style={styles.dangerDesc}>
                To operacja nieodwracalna. Potwierdź hasłem:
              </Text>
              <TextInput
                style={styles.inputDanger}
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Twoje hasło"
                placeholderTextColor="#ffcdd2"
              />
              <TouchableOpacity
                style={styles.btnDelete}
                onPress={handleDeleteAccount}
                disabled={loading}
              >
                <Text style={styles.deleteText}>Usuń trwale</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* WYLOGUJ */}
        <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#555" />
          <Text style={styles.logoutText}>Wyloguj się</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20, paddingBottom: 150 },
  header: { alignItems: "center", marginBottom: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: { fontSize: 36, color: "white", fontWeight: "bold" },
  camIcon: {
    position: "absolute",
    bottom: 10,
    right: 0,
    backgroundColor: "#333",
    padding: 6,
    borderRadius: 15,
  },
  email: { fontSize: 16, color: "#333", fontWeight: "bold" },
  role: { fontSize: 14, color: "#666" },

  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 14, color: "#666", marginBottom: 5 },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  btnPrimary: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  btnSecondary: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  btnTextSecondary: {
    color: theme.colors.primary,
    fontWeight: "bold",
    fontSize: 16,
  },

  // Danger Zone
  dangerSection: {
    borderColor: "#ffcdd2",
    borderWidth: 1,
    backgroundColor: "#ffebee",
  },
  dangerDesc: { color: "#b71c1c", marginBottom: 10 },
  inputDanger: {
    backgroundColor: "#ef5350",
    borderWidth: 1,
    borderColor: "#e53935",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    color: "white",
  },
  btnDelete: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#c62828",
    borderRadius: 8,
  },
  deleteText: { fontSize: 16, fontWeight: "bold", color: "white" },

  btnLogout: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 15,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    marginBottom: 30,
  },
  logoutText: { fontSize: 16, fontWeight: "bold", color: "#555" },
});

export default UserProfileScreen;
