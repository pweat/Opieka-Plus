import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../firebaseConfig";
import { theme } from "../../theme";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

const EditPatientScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { patientId } = route.params;

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const patientDocRef = doc(db, "patients", patientId);

  useEffect(() => {
    const fetchPatientData = async () => {
      setLoading(true);
      try {
        const docSnap = await getDoc(patientDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name);
          setDescription(data.description);
          setImageUri(data.photoURL || null);
        } else {
          Alert.alert("Błąd", "Nie znaleziono podopiecznego.");
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert("Błąd", "Nie udało się pobrać danych.");
      }
      setLoading(false);
    };
    fetchPatientData();
  }, [patientId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], // Poprawiony typ na string
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImageAndGetURL = async (uri: string, id: string) => {
    const storage = getStorage();
    const blob: Blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        reject(new TypeError("Network request failed"));
      };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });

    const storageRef = ref(storage, `patients/${id}/profile_picture.jpg`);
    await uploadBytes(storageRef, blob);

    // <--- POPRAWKA TUTAJ:
    (blob as any).close();

    return await getDownloadURL(storageRef);
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) return Alert.alert("Błąd", "Imię nie może być puste.");

    setIsUploading(true);
    let newPhotoURL = imageUri;

    try {
      // Sprawdź, czy wybrano nowe zdjęcie (z lokalnego pliku)
      if (imageUri && imageUri.startsWith("file://")) {
        newPhotoURL = await uploadImageAndGetURL(imageUri, patientId);
      }

      await updateDoc(patientDocRef, {
        name: name,
        description: description,
        photoURL: newPhotoURL || "",
      });

      Alert.alert("Sukces", "Profil zaktualizowany.");
      navigation.goBack();
    } catch (error) {
      console.error("Błąd podczas aktualizacji: ", error);
      Alert.alert("Błąd", "Wystąpił błąd podczas zapisu.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProfile = () => {
    Alert.alert("Potwierdź usunięcie", `Usunąć profil ${name}?`, [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Usuń",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(patientDocRef);
            Alert.alert("Sukces", "Usunięto profil.");
            navigation.navigate("Home");
          } catch (error) {
            Alert.alert("Błąd", "Nie udało się usunąć profilu.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
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
          <Text style={styles.imageText}>Zmień zdjęcie</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.title}>Edytuj: {name}</Text>
      <Text style={styles.label}>Imię:</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Opis:</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={handleUpdateProfile}
          disabled={isUploading}
        >
          <Text style={styles.buttonText}>
            {isUploading ? "Aktualizowanie..." : "Zapisz zmiany"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.deleteZone}>
        <TouchableOpacity
          style={styles.buttonDelete}
          onPress={handleDeleteProfile}
        >
          <Text style={styles.deleteText}>Usuń profil</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.large,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: { justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: theme.fonts.title,
    fontWeight: "bold",
    marginBottom: theme.spacing.large,
    textAlign: "center",
    color: theme.colors.text,
  },
  label: {
    fontSize: theme.fonts.body,
    fontWeight: "bold",
    marginBottom: theme.spacing.small,
    marginLeft: 5,
    color: theme.colors.text,
  },
  input: {
    width: "100%",
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
    backgroundColor: theme.colors.card,
    fontSize: theme.fonts.body,
    color: theme.colors.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: theme.spacing.medium,
  },
  buttonContainer: { marginTop: theme.spacing.medium },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  deleteZone: {
    marginTop: theme.spacing.large * 2,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: theme.spacing.large,
  },
  buttonDelete: {
    backgroundColor: theme.colors.card,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "red",
  },
  deleteText: { color: "red", fontWeight: "bold" },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
});

export default EditPatientScreen;
