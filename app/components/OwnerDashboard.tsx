import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

interface OwnerDashboardProps {
  patients: any[];
  navigation: any;
}

const OwnerDashboard = ({ patients, navigation }: OwnerDashboardProps) => {
  const [nextShift, setNextShift] = useState<any>(null);
  const [loadingShift, setLoadingShift] = useState(false);

  // Funkcja do pobrania najbliższej wizyty (tylko dla pierwszego pacjenta w uproszczeniu)
  useEffect(() => {
    if (patients.length === 1) {
      fetchNextShift(patients[0].id);
    }
  }, [patients]);

  const fetchNextShift = async (patientId: string) => {
    setLoadingShift(true);
    try {
      const now = new Date();
      // Pobierz wizyty, które zaczynają się od "teraz" w górę
      const q = query(
        collection(db, "shifts"),
        where("patientId", "==", patientId),
        where("start", ">=", now),
        orderBy("start", "asc"),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setNextShift({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setNextShift(null);
      }
    } catch (e) {
      console.log("Błąd pobierania wizyty dashboard", e);
    }
    setLoadingShift(false);
  };

  // === 1. WIDOK: BRAK PACJENTÓW (Bez zmian) ===
  if (patients.length === 0) {
    return (
      <View
        style={[
          styles.content,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <View style={styles.emptyDashboardContainer}>
          <View
            style={[styles.emptyIconCircle, { backgroundColor: "#FFF8E1" }]}
          >
            <MaterialCommunityIcons
              name="account-heart"
              size={80}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>Zacznijmy!</Text>
          <Text style={styles.emptyDesc}>
            Aktualnie nie masz przypisanych żadnych podopiecznych.{"\n\n"}
            Utwórz profil dla bliskiej osoby, aby móc planować wizyty i
            zarządzać opieką.
          </Text>
          <TouchableOpacity
            style={styles.bigAddButton}
            onPress={() => navigation.navigate("AddPatient")}
          >
            <MaterialCommunityIcons
              name="plus-circle"
              size={24}
              color="white"
              style={{ marginRight: 10 }}
            />
            <Text style={styles.bigAddButtonText}>Dodaj Podopiecznego</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // === 2. WIDOK: JEDEN PACJENT (TUTAJ ZMIENIAMY LOGIKĘ) ===
  if (patients.length === 1) {
    const p = patients[0];
    // Sprawdzamy, czy jest to "nowy" profil (brak opiekunów)
    const hasCaregivers = p.caregiverIds && p.caregiverIds.length > 0;

    return (
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* KARTA PACJENTA (UPROSZCZONA) */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroAvatarContainer}>
              {p.photoURL ? (
                <Image source={{ uri: p.photoURL }} style={styles.heroAvatar} />
              ) : (
                <View style={styles.heroAvatarPlaceholder}>
                  <Text style={styles.heroAvatarText}>
                    {p.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text style={styles.heroLabel}>Twój Podopieczny</Text>
              <Text style={styles.heroName}>{p.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.profileIconBtn}
              onPress={() =>
                navigation.navigate("PatientDetail", {
                  patientId: p.id,
                  patientName: p.name,
                })
              }
            >
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* STATUS LUB NAJBLIŻSZA WIZYTA */}
          <View style={styles.statusStrip}>
            {nextShift ? (
              <>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={20}
                  color="#2e7d32"
                />
                <Text style={styles.statusText}>
                  Kolejna wizyta:{" "}
                  <Text style={{ fontWeight: "bold" }}>
                    {nextShift.start.toDate().toLocaleDateString("pl-PL")}{" "}
                    {nextShift.start
                      .toDate()
                      .toLocaleTimeString("pl-PL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </Text>
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="calendar-blank"
                  size={20}
                  color="#666"
                />
                <Text style={styles.statusText}>Brak zaplanowanych wizyt.</Text>
              </>
            )}
          </View>
        </View>

        {/* === LOGIKA ONBOARDINGU (PROWADZENIE ZA RĘKĘ) === */}
        {!hasCaregivers ? (
          <View style={styles.onboardingContainer}>
            <Text style={styles.onboardingTitle}>👋 Konfiguracja Opieki</Text>
            <Text style={styles.onboardingSub}>
              Wygląda na to, że zaczynasz. Wykonaj te kroki, aby wszystko
              działało:
            </Text>

            {/* KROK 1 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Zaproś Opiekuna</Text>
                <Text style={styles.stepDesc}>
                  Dodaj osobę (opiekunkę lub członka rodziny), która będzie
                  pomagać. Otrzymasz kod zaproszenia.
                </Text>
                <TouchableOpacity
                  style={styles.stepActionBtn}
                  onPress={() =>
                    navigation.navigate("ManageCaregivers", { patientId: p.id })
                  }
                >
                  <Text style={styles.stepBtnText}>Dodaj Opiekuna</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={16}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* KROK 2 */}
            <View style={[styles.stepCard, { opacity: 0.7 }]}>
              <View style={[styles.stepNumber, { backgroundColor: "#ccc" }]}>
                <Text style={styles.stepNumText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Zaplanuj pierwszą wizytę</Text>
                <Text style={styles.stepDesc}>
                  Gdy już masz opiekuna, ustal kiedy ma przyjść. To uruchomi
                  kalendarz.
                </Text>
                {/* Ten przycisk kieruje do planowania, ale sugerujemy najpierw krok 1 */}
                <TouchableOpacity
                  style={[styles.stepActionBtn, { backgroundColor: "#999" }]}
                  onPress={() =>
                    navigation.navigate("ScheduleVisit", {
                      patientId: p.id,
                      patientName: p.name,
                    })
                  }
                >
                  <Text style={styles.stepBtnText}>Zaplanuj (po kroku 1)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          // === WIDOK "WSZYSTKO GOTOWE" (Skróty) ===
          <View>
            <Text style={styles.sectionLabel}>Szybkie Akcje</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.bigActionTile}
                onPress={() =>
                  navigation.navigate("ScheduleVisit", {
                    patientId: p.id,
                    patientName: p.name,
                  })
                }
              >
                <View style={[styles.tileIcon, { backgroundColor: "#E3F2FD" }]}>
                  <MaterialCommunityIcons
                    name="calendar-plus"
                    size={32}
                    color="#1976D2"
                  />
                </View>
                <Text style={styles.tileTitle}>Zaplanuj Wizytę</Text>
                <Text style={styles.tileDesc}>
                  Dodaj nową wizytę do grafiku.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bigActionTile}
                onPress={() =>
                  navigation.navigate("PatientDetail", {
                    patientId: p.id,
                    patientName: p.name,
                  })
                }
              >
                <View style={[styles.tileIcon, { backgroundColor: "#E8F5E9" }]}>
                  <MaterialCommunityIcons
                    name="history"
                    size={32}
                    color="#388E3C"
                  />
                </View>
                <Text style={styles.tileTitle}>Historia i Raporty</Text>
                <Text style={styles.tileDesc}>
                  Zobacz podsumowania i kalendarz.
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.wideActionBtn}
              onPress={() =>
                navigation.navigate("ManageCaregivers", { patientId: p.id })
              }
            >
              <MaterialCommunityIcons
                name="account-group"
                size={24}
                color="#555"
              />
              <Text style={styles.wideBtnText}>
                Zarządzaj zespołem opiekunów
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#ccc"
              />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  // === 3. WIDOK: WIELU PACJENTÓW (Lista) ===
  return (
    <View style={styles.content}>
      <Text style={styles.title}>Twoi podopieczni</Text>
      <FlatList
        data={patients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.patientCard}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate("PatientDetail", {
                patientId: item.id,
                patientName: item.name,
              })
            }
          >
            <View style={styles.cardInner}>
              <View style={styles.avatarWrapper}>
                {item.photoURL ? (
                  <Image
                    source={{ uri: item.photoURL }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardLabel}>PODOPIECZNY</Text>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardDesc} numberOfLines={1}>
                  {item.description || "Brak opisu"}
                </Text>
              </View>
              <View style={styles.arrowContainer}>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </View>
            </View>
          </TouchableOpacity>
        )}
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.large,
    paddingTop: theme.spacing.medium,
  },

  // EMPTY STATE
  emptyDashboardContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
    backgroundColor: "white",
    padding: 30,
    borderRadius: 20,
    elevation: 3,
    width: "100%",
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFF8E1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 10,
  },
  emptyDesc: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 24,
  },
  bigAddButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
    elevation: 5,
    width: "100%",
  },
  bigAddButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },

  // HERO CARD (Simple)
  heroCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    marginBottom: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  heroHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  heroAvatarContainer: { marginRight: 15 },
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eee",
  },
  heroAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  heroAvatarText: { color: "white", fontSize: 24, fontWeight: "bold" },
  heroLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
  },
  heroName: { fontSize: 20, fontWeight: "bold", color: theme.colors.text },
  profileIconBtn: { padding: 10, backgroundColor: "#f5f5f5", borderRadius: 50 },
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  statusText: { fontSize: 13, color: "#444" },

  // ONBOARDING STYLES (Prowadzenie za rękę)
  onboardingContainer: { marginTop: 10 },
  onboardingTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  onboardingSub: { fontSize: 14, color: "#666", marginBottom: 20 },

  stepCard: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    marginTop: 2,
  },
  stepNumText: { color: "white", fontWeight: "bold" },
  stepTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  stepDesc: { fontSize: 13, color: "#666", marginBottom: 10, lineHeight: 18 },
  stepActionBtn: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 5,
  },
  stepBtnText: { color: "white", fontWeight: "bold", fontSize: 13 },

  // QUICK ACTIONS (Gdy już skonfigurowane)
  sectionLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 15,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  bigActionTile: {
    width: "48%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    alignItems: "center",
  },
  tileIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
    textAlign: "center",
  },
  tileDesc: { fontSize: 12, color: "#888", textAlign: "center" },

  wideActionBtn: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 1,
  },
  wideBtnText: { fontSize: 14, fontWeight: "600", color: "#555" },

  // LIST (Many patients)
  title: {
    fontSize: theme.fonts.title,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.medium,
  },
  patientCard: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.medium,
    borderRadius: 16,
    marginBottom: theme.spacing.medium,
    elevation: 4,
  },
  cardInner: { flexDirection: "row", alignItems: "center", padding: 15 },
  avatarWrapper: {
    padding: 2,
    backgroundColor: "white",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 1,
  },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#eee" },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "white", fontSize: 24, fontWeight: "bold" },
  cardContent: { flex: 1, marginLeft: 15, justifyContent: "center" },
  cardLabel: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: theme.colors.text },
  cardDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  arrowContainer: { marginLeft: 10 },
  list: { width: "100%" },
});

export default OwnerDashboard;
