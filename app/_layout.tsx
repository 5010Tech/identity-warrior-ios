import { AutofillProvider } from "@/components/autofill/context/AutofillContext";
import DeviceProvider from "@/components/device/DeviceProvider";
import { SlapshotGlobalHost } from "@/components/Slapshot/SlapshotGlobalHost";
import { SlapshotContextProvider } from "@/components/Slapshot/SlapshotContext";
import { SelfieModeSync } from "@/components/Slapshot/SelfieModeSync";
import { RetentionSync } from "@/features/ebts/RetentionSync";
import { useColorScheme } from "@/components/useColorScheme";
import { UserProvider } from "@/components/user";
import { APIClient } from "@/util/server/APIClient";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemeProvider } from "@react-navigation/native";
import { IWDarkTheme, IWLightTheme } from "@/components/theme/navigationTheme";
import { EulaGate } from "@/components/eula/EulaGate";
import { LicenseGate } from "@/features/license/LicenseGate";
import { PasscodeGate } from "@/components/passcode/PasscodeViews";
import { HeaderBackButton } from "@/components/navigation";
import { ThemeModeSync } from "@/components/theme/ThemeModeSync";
import { Camera } from "expo-camera";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import WifiManager from "react-native-wifi-reborn";
import { tHelper } from "@/translations/translationHelper";
import { SubmissionProvider } from "@/components/submissions";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  const [clientInitialized, setClientInitialized] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // Initialize the API client.
  useEffect(() => {
    APIClient.init()
      .then(() => {
        setClientInitialized(true);
      })
      .catch((error) => {
        console.error("APIClient initialization error:", error);
        setClientInitialized(true);
      });
  }, []);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync();
    // Asks for the permission early; no network name yet is not an error.
    WifiManager.getCurrentWifiSSID().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (fontsLoaded && clientInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, clientInitialized]);

  if (!fontsLoaded || !clientInitialized) {
    return null;
  }

  return (
    <GestureHandlerRootView>
      <RootLayoutNav />
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  return (
    <DeviceProvider>
      <SlapshotContextProvider>
        <UserProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? IWDarkTheme : IWLightTheme}
          >
            <AutofillProvider>
              <ThemeModeSync />
              {/* Nothing of the app is there until a valid license is in. */}
              <LicenseGate>
              <SelfieModeSync />
              <RetentionSync />
              <EulaGate />
              <PasscodeGate />
              <SubmissionProvider>
                <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
                {/* The app's own screens are portrait only. The contactless capture
                    runs in its own window and may turn landscape; when it closes,
                    the app comes back upright. */}
                <Stack screenOptions={{ orientation: "portrait" }}>
                  <Stack.Screen
                    name="(tabs)"
                    options={{
                      headerShown: false,
                      headerBackTitle: tHelper("home"),
                    }}
                  />
                  <Stack.Screen
                    name="capture"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="faceCompare"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="devices"
                    options={{
                      headerBackTitle: tHelper("back"),
                      headerTitle: tHelper("devices"),
                      // The system back button was not responding on this
                      // screen, so it uses the app's own.
                      headerBackVisible: false,
                      headerLeft: () => <HeaderBackButton />,
                    }}
                  />
                  <Stack.Screen
                    name="submissions"
                    options={{ headerShown: false, presentation: "modal" }}
                  />
                  <Stack.Screen
                    name="latent"
                    options={{
                      headerTitle: tHelper("latentFpCapture"),
                      // The system back button does not respond here either
                      // (as on Devices), so this uses the app's own.
                      headerBackVisible: false,
                      headerLeft: () => <HeaderBackButton />,
                    }}
                  />
                  <Stack.Screen
                    name="latentTransaction"
                    options={{
                      headerTitle: tHelper("latentTransTitle"),
                      // One Back only: the one beside Submit Transaction.
                      headerBackVisible: false,
                      headerLeft: () => null,
                    }}
                  />
                  <Stack.Screen name="+not-found" />
                  <Stack.Screen
                    name="settings"
                    options={{
                      headerShown: false,
                      headerBackTitle: tHelper("settings"),
                    }}
                  />
                  <Stack.Screen
                    name="apiSettings"
                    options={{
                      presentation: "modal",
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="ofiq"
                    options={{ presentation: "modal", headerShown: false }}
                  />
                </Stack>
                <SlapshotGlobalHost />
              </SubmissionProvider>
              </LicenseGate>
            </AutofillProvider>
          </ThemeProvider>
        </UserProvider>
      </SlapshotContextProvider>
    </DeviceProvider>
  );
}
