import { tHelper } from "@/translations/translationHelper";
import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";

/**
 * Opens the camera for a scar / mark / tattoo photo. Resolves with the JPEG as
 * base64, or undefined if the user backed out or the camera couldn't be used
 * (in which case they have already been told why).
 */
export const takeSmtPhoto = async (): Promise<string | undefined> => {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(tHelper("cameraPerm"), tHelper("allowCamera"), [
        { text: tHelper("openSettings"), onPress: () => Linking.openSettings() },
        { text: tHelper("cancel"), style: "cancel" },
      ]);
      return undefined;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.8,
    });
    return result.canceled ? undefined : (result.assets[0]?.base64 ?? undefined);
  } catch (e) {
    console.error("SMT photo failed", e);
    Alert.alert(tHelper("smts"), e instanceof Error ? e.message : String(e));
    return undefined;
  }
};

let pendingPhoto: string | undefined;

/** Hands a just-taken photo to the edit screen (too large for a route param). */
export const setPendingSmtPhoto = (photo?: string) => {
  pendingPhoto = photo;
};

export const takePendingSmtPhoto = () => {
  const photo = pendingPhoto;
  pendingPhoto = undefined;
  return photo;
};
