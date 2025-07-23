import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { useIsFocused } from "@react-navigation/native";

interface UserProfile {
  uid: string;
  email: string;
  role: "opiekun_glowny" | "opiekun";
}
interface PatientProfile {
  id: string;
  name: string;
  description: string;
}

const HomeScreen = ({ navigation }: { navigation: any }) => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [patients, setPatients] = useState<PatientProfile[]>([]);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchData();
    }
  }, [isFocused]);

  const fetchData = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile;
        setUserProfile(profile);

        if (profile.role === "opiekun_glowny") {
          const q = query(
            collection(db, "patients"),
            where("ownerId", "==", user.uid)
          );
          const querySnapshot = await getDocs(q);
          const patientsList: PatientProfile[] = [];
          querySnapshot.forEach((doc) => {
            patientsList.push({ id: doc.id, ...doc.data() } as PatientProfile);
          });
          setPatients(patientsList);
        }
      } else {
        console.log("No such user document!");
      }
    }
    setLoading(false);
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Witaj, {userProfile?.email}!</Text>

      {userProfile?.role === "opiekun_glowny" ? (
        <View style={styles.content}>
          <Text style={styles.infoText}>Twoi podopieczni</Text>
          <FlatList
            data={patients}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.patientCard}
                onPress={() =>
                  navigation.navigate("PatientDetail", { patientId: item.id })
                }
              >
                <Text style={styles.patientName}>{item.name}</Text>
                <Text style={styles.patientDescription}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyListText}>
                Brak podopiecznych. Dodaj pierwszy profil.
              </Text>
            }
            style={styles.list}
          />
          <Button
            title="+ Dodaj profil podopiecznego"
            onPress={() => navigation.navigate("AddPatient")}
          />
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.infoText}>Twój harmonogram pracy.</Text>
          <Text style={styles.emptyListText}>
            Nie masz jeszcze zaplanowanych wizyt.
          </Text>
        </View>
      )}

      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Wyloguj się</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 80,
    backgroundColor: "#f0f0f0",
  },
  content: { flex: 1, width: "100%" },
  welcomeText: {
    fontSize: 16,
    position: "absolute",
    top: 50,
    alignSelf: "center",
    color: "gray",
  },
  infoText: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  emptyListText: {
    fontSize: 16,
    color: "gray",
    textAlign: "center",
    marginTop: 50,
  },
  list: { width: "100%" },
  patientCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  patientName: { fontSize: 18, fontWeight: "bold", color: "#444" },
  patientDescription: { fontSize: 14, color: "#666", marginTop: 5 },
  logoutButton: { padding: 10, alignSelf: "center", marginBottom: 20 },
  logoutText: { color: "red", fontSize: 16 },
});

export default HomeScreen;
