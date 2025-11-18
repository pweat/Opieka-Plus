import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView, // <--- DODANO ScrollView
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { db, auth } from "../../firebaseConfig";
import { theme } from "../../theme";
// <--- DODANO doc, updateDoc
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const AddPatientScreen = ({ navigation }: { navigation: any }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], // Używamy stringa zamiast enum dla prostoty (lub ImagePicker.MediaTypeOptions.Images)
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImageAndGetURL = async (uri: string, patientId: string) => {
    const storage = getStorage();
    const blob: Blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        console.log(e);
        reject(new TypeError("Network request failed"));
      };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });

    const storageRef = ref(
      storage,
      `patients/${patientId}/profile_picture.jpg`
    );
    const snapshot = await uploadBytes(storageRef, blob);

    // <--- POPRAWKA: Rzutowanie na 'any', aby TypeScript nie krzyczał o metodę close()
    (blob as any).close();

    const url = await getDownloadURL(snapshot.ref);
    return url;
  };

  const handleSaveProfile = async () => {
    if (name.trim() === "") return Alert.alert("Błąd", "Podaj imię.");
    const user = auth.currentUser;
    if (!user) return;

    setIsUploading(true);

    try {
      const docRef = await addDoc(collection(db, "patients"), {
        name: name,
        description: description,
        ownerId: user.uid,
        createdAt: new Date(),
        photoURL: "",
      });

      if (imageUri) {
        const photoURL = await uploadImageAndGetURL(imageUri, docRef.id);
        await updateDoc(doc(db, "patients", docRef.id), { photoURL });
      }

      Alert.alert("Sukces", "Profil podopiecznego został pomyślnie dodany.");
      navigation.goBack();
    } catch (error) {
      console.error("Błąd podczas zapisu: ", error);
      Alert.alert("Błąd", "Wystąpił błąd podczas zapisu profilu.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.imagePicker}
          onPress={pickImage}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <Text style={styles.imageText}>Dodaj zdjęcie</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Imię podopiecznego:</Text>
        <TextInput
          style={styles.input}
          placeholder="np. Babcia Krysia"
          placeholderTextColor={theme.colors.textSecondary}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Krótki opis:</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="np. Stan zdrowia"
          placeholderTextColor={theme.colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline={true}
        />

        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={handleSaveProfile}
          disabled={isUploading}
        >
          <Text style={styles.buttonPrimaryText}>
            {isUploading ? "Zapisywanie..." : "Zapisz profil"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.spacing.large, paddingBottom: 100 },
  imagePicker: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.textSecondary,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: theme.spacing.large,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fonts.body,
    textAlign: "center",
  },
  label: {
    fontSize: theme.fonts.body,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
    fontSize: theme.fonts.body,
    color: theme.colors.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: theme.spacing.medium,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.medium,
    borderRadius: 10,
    alignItems: "center",
    marginTop: theme.spacing.small,
    elevation: 3,
  },
  buttonPrimaryText: {
    color: theme.colors.primaryText,
    fontSize: theme.fonts.body,
    fontWeight: "bold",
  },
});

export default AddPatientScreen;
