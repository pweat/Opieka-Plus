import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { theme } from "../../theme";
import { signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { useIsFocused } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Importujemy komponenty Dashboardów
import OwnerDashboard from "../components/OwnerDashboard";
import CaregiverDashboard from "../components/CaregiverDashboard";

interface UserProfile {
  uid: string;
  email: string;
  role: "opiekun_glowny" | "opiekun";
  name?: string;
}

const HomeScreen = ({ navigation }: { navigation: any }) => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) fetchData();
  }, [isFocused]);

  const fetchData = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile;
        setUserProfile(profile);

        if (profile.role === "opiekun_glowny") {
          const q = query(
            collection(db, "patients"),
            where("ownerId", "==", user.uid)
          );
          const querySnapshot = await getDocs(q);
          setPatients(
            querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          );
        } else if (profile.role === "opiekun") {
          const patientQuery = query(
            collection(db, "patients"),
            where("caregiverIds", "array-contains", user.uid)
          );
          const patientSnapshot = await getDocs(patientQuery);
          const patientsList = patientSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setPatients(patientsList);

          if (patientsList.length > 0) {
            const shiftQuery = query(
              collection(db, "shifts"),
              where("caregiverId", "==", user.uid)
            );
            const shiftSnapshot = await getDocs(shiftQuery);
            const allShifts = shiftSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            const activeShifts = allShifts.filter(
              (s: any) => s.status !== "completed"
            );
            activeShifts.sort(
              (a: any, b: any) => a.start.toMillis() - b.start.toMillis()
            );
            setShifts(activeShifts);
          } else {
            setShifts([]);
          }
        }
      }
    }
    setLoading(false);
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.card} />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.welcomeText} numberOfLines={1}>
          Witaj,{" "}
          <Text style={{ fontWeight: "bold", color: theme.colors.primary }}>
            {userProfile?.name || userProfile?.email}
          </Text>
          !
        </Text>
        <TouchableOpacity onPress={handleLogout}>
          <MaterialCommunityIcons
            name="logout"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* DASHBOARD */}
      {userProfile?.role === "opiekun_glowny" ? (
        <OwnerDashboard patients={patients} navigation={navigation} />
      ) : (
        <CaregiverDashboard
          patients={patients}
          shifts={shifts}
          navigation={navigation}
          onRefresh={fetchData}
        />
      )}

      {/* FAB - Przycisk dodawania (POPRAWIONY WARUNEK) */}
      {/* Wyświetlamy go teraz zawsze, gdy jest przynajmniej 1 pacjent. 
          Gdy jest 0, OwnerDashboard wyświetla swój własny duży przycisk na środku. */}
      {userProfile?.role === "opiekun_glowny" && patients.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddPatient")}
        >
          <MaterialCommunityIcons name="plus" size={30} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.large,
    paddingBottom: theme.spacing.medium,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 50,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    elevation: 3,
  },
  welcomeText: { color: theme.colors.text, fontSize: 16, flex: 1 },
  fab: {
    position: "absolute",
    right: theme.spacing.large,
    bottom: theme.spacing.large,
    backgroundColor: theme.colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    zIndex: 1000, // Upewniamy się, że jest na wierzchu
  },
});

export default HomeScreen;
