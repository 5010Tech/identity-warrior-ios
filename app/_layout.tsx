import { AutofillProvider } from "@/components/autofill/context/AutofillContext";
import DeviceProvider from "@/components/device/DeviceProvider";
import { SlapshotGlobalHost } from "@/components/Slapshot/SlapshotGlobalHost";
import { SlapshotContextProvider } from "@/components/Slapshot/SlapshotContext";
import { useColorScheme } from "@/components/useColorScheme";
import { UserProvider } from "@/components/user";
import { APIClient } from "@/util/server/APIClient";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
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
    WifiManager.getCurrentWifiSSID();
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
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <AutofillProvider>
              <SubmissionProvider>
                <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
                <Stack>
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
                    }}
                  />
                  <Stack.Screen
                    name="submissions"
                    options={{ headerShown: false, presentation: "modal" }}
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
            </AutofillProvider>
          </ThemeProvider>
        </UserProvider>
      </SlapshotContextProvider>
    </DeviceProvider>
  );
}
