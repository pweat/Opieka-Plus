import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../firebaseConfig";

import AppNavigator from "./AppNavigator";
import AuthNavigator from "./AuthNavigator";

const RootNavigator = () => {
  // Stan, który będzie przechowywał informację o zalogowanym użytkowniku
  const [user, setUser] = useState<User | null>(null);

  // useEffect to "haczyk", który pozwala uruchomić kod w odpowiednim momencie cyklu życia komponentu.
  // Używamy go tutaj, aby włączyć nasłuchiwanie na zmiany stanu logowania tylko raz, po załadowaniu komponentu.
  useEffect(() => {
    // onAuthStateChanged to funkcja z Firebase, która uruchamia się za każdym razem,
    // gdy użytkownik się zaloguje lub wyloguje.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Aktualizujemy nasz stan informacją o użytkowniku
    });

    // Zwracamy funkcję "czyszczącą", która wyłączy nasłuchiwanie, gdy komponent zostanie odmontowany
    return () => unsubscribe();
  }, []); // Pusta tablica `[]` oznacza, że efekt ma się uruchomić tylko raz.

  // Na podstawie stanu 'user' decydujemy, który zestaw ekranów pokazać.
  return user ? <AppNavigator /> : <AuthNavigator />;
};

export default RootNavigator;
