import { initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
// Ta ścieżka JEST POPRAWNA, gdy zainstalują się właściwe pakiety
import { getReactNativePersistence } from "firebase/auth/react-native";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Obiekt konfiguracyjny (odczytujący sekrety)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  throw new Error(
    "Nie znaleziono kluczy Firebase. Sprawdź swoje sekrety EAS (EXPO_PUBLIC_...)."
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicjalizacja Auth (teraz z poprawnym importem)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
const db = getFirestore(app);

export { auth, db };
