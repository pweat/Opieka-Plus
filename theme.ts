// app/theme.ts

// Definiujemy naszą paletę kolorów
const palette = {
  // Nasz główny, ciepły kolor tła
  beige: "#f5f5f0",
  // Nasz "brudny" biały do kart i tła
  white: "#ffffff",
  // Ciemny, ciepły grafit zamiast czystej czerni
  graphite: "#3a3a3a",
  // Zgaszony, neutralny szary
  gray: "#8a8a8a",
  // Główny kolor akcentu (przyciski, linki)
  primaryBrown: "#8B4513", // To jest kolor "SaddleBrown" - mocny, ciepły brąz
  // Jaśniejszy brąz do tła przycisków
  lightBrown: "#D2B48C", // Kolor "Tan"
};

// Definiujemy nasz motyw, którego będziemy używać w aplikacji
export const theme = {
  colors: {
    // Tło główne aplikacji
    background: palette.beige,
    // Tło dla "kart" (np. lista podopiecznych)
    card: palette.white,
    // Główny kolor tekstu
    text: palette.graphite,
    // Kolor tekstu drugorzędnego (np. opisy)
    textSecondary: palette.gray,
    // Kolor głównych przycisków
    primary: palette.primaryBrown,
    // Kolor tekstu na głównych przyciskach
    primaryText: palette.white,
  },
  // Definiujemy rozmiary czcionek
  fonts: {
    title: 32,
    subtitle: 18,
    body: 16,
  },
  // Definiujemy odstępy
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
  },
};
