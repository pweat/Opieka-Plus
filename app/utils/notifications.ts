import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// === KONFIGURACJA POWIADOMIEŃ ===
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // USUNIĘTO: shouldShowAlert: true (To powodowało ostrzeżenie)

    // ZAMIAST TEGO UŻYWAMY TYCH DWÓCH:
    shouldShowBanner: true, // Pokazuje pasek na górze ekranu
    shouldShowList: true, // Pokazuje powiadomienie w centrum powiadomień

    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Brak uprawnień do powiadomień!");
      return null;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log("Twój Push Token:", token);
    } catch (e) {
      console.log("Błąd pobierania tokena:", e);
    }
  } else {
    console.log("Powiadomienia działają tylko na fizycznym urządzeniu.");
  }

  return token;
}

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string
) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
    data: { someData: "goes here" },
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}
