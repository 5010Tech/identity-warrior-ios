import { Linking, Platform } from "react-native";

const openSettings = (at?: string) => {
  if (Platform.OS === "ios") {
    Linking.openURL(`App-Prefs:root=${at || "WIFI"}`).catch(() => {
      Linking.openSettings();
    });
  } else {
    Linking.openURL(`android.settings.${at || "WIFI"}_SETTINGS`);
  }
};

export default openSettings;
