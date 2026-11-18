import { tHelper } from "@/translations/translationHelper";
import { useCameraPermissions } from "expo-camera";
import { Href, useRouter } from "expo-router";
import { useRef, useEffect } from "react";
import { Alert, Linking } from "react-native";

export const useAllowCamera = (redirect?: Href<string>) => {
  const router = useRouter();
  const [cameraPermission] = useCameraPermissions();

  const alertShown = useRef(false);

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && !alertShown.current) {
      alertShown.current = true;
      Alert.alert(tHelper("cameraPerm"), tHelper("allowCamera"), [
        {
          text: tHelper("openSettings"),
          onPress: async () => {
            const supported = await Linking.canOpenURL("app-settings:");
            if (supported) {
              await Linking.openURL("app-settings:");
            } else {
              console.warn("Unable to open app settings");
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => (redirect ? router.push(redirect) : router.back()),
        },
      ]);
    }
  }, [cameraPermission, redirect, router]);

  return cameraPermission;
};
