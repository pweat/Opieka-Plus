# Opieka Plus 🏥

Aplikacja mobilna do koordynacji opieki nad osobami starszymi. Umożliwia łączenie Opiekunów Głównych (rodzina) z Opiekunami/Opiekunkami, planowanie wizyt oraz raportowanie wykonanych zadań i samopoczucia podopiecznego.

## 🚀 Funkcjonalności

### Dla Opiekuna Głównego:

- Tworzenie, edycja i usuwanie profili podopiecznych.
- Generowanie kodów zaproszeń dla opiekunek.
- Planowanie wizyt (data, godzina, lista zadań) z użyciem kalendarza.
- Podgląd historii wizyt i szczegółowych raportów (nastrój, energia, notatki).

### Dla Opiekuna / Opiekunki:

- Dołączanie do profilu podopiecznego za pomocą kodu.
- Podgląd harmonogramu wizyt.
- Dziennik wizyty: odhaczanie zadań, raportowanie nastroju (emoji) i energii.
- Dodawanie notatek z wizyty.

## 🛠️ Technologie (Stack)

Aplikacja została zbudowana na najnowszych dostępnych technologiach (Stan na Listopad 2025):

- **Framework:** React Native 0.81 (Expo SDK 54)
- **Silnik:** React 19
- **Język:** TypeScript 5.9
- **Backend:** Firebase v12 (Authentication, Firestore)
- **Nawigacja:** React Navigation v7
- **UI:** Custom Design System (`theme.ts`)
- **Dodatki:**
  - `react-native-modal-datetime-picker` - kalendarz/zegar
  - `@react-native-async-storage` - pamięć lokalna

## ⚙️ Instalacja i Uruchomienie

1.  **Pobierz repozytorium:**

    ```bash
    git clone [adres-twojego-repo]
    cd Opieka-Plus
    ```

2.  **Zainstaluj zależności:**

    ```bash
    npm install
    ```

3.  **Skonfiguruj środowisko (.env):**
    Stwórz plik `.env` w głównym folderze i uzupełnij go kluczami z Firebase (zmienne muszą zaczynać się od `EXPO_PUBLIC_`):

    ```env
    EXPO_PUBLIC_FIREBASE_API_KEY=twoj_klucz
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=twoja_domena
    EXPO_PUBLIC_FIREBASE_PROJECT_ID=twoje_id
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=twoj_bucket
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=twoj_sender_id
    EXPO_PUBLIC_FIREBASE_APP_ID=twoje_app_id
    ```

4.  **Uruchom aplikację:**
    ```bash
    npx expo start
    ```

## 📱 Struktura Projektu

- `app/screens` - Ekrany aplikacji (Login, Home, Szczegóły wizyty itp.)
- `app/navigation` - Konfiguracja nawigacji i przełączania ekranów.
- `app/components` - Reużywalne komponenty.
- `theme.ts` - Centralny plik ze stylami i kolorami.
- `firebaseConfig.ts` - Konfiguracja połączenia z bazą.
