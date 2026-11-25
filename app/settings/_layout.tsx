import React from "react";
import { Stack } from "expo-router";
import { tHelper } from "@/translations/translationHelper";

export default function SettingsLayout() {
  return (
    // No KeyboardAvoidingView here: each form scrolls itself clear of the keyboard.
    <>
      <Stack screenOptions={{ orientation: "portrait" }}>
        <Stack.Screen
          name="submissionSettings"
          options={{
            headerShown: true,
            title: tHelper("submissionSettings"),
            headerTitle: tHelper("submissionSettings"),
          }}
        />
        <Stack.Screen
          name="appSettings"
          options={{
            title: tHelper("appSettings"),
            headerTitle: tHelper("appSettings"),
          }}
        />
        <Stack.Screen
          name="abisSettings"
          options={{
            title: tHelper("dodAbis"),
            headerTitle: tHelper("dodAbis"),
            headerBackTitle: tHelper("settings"),
          }}
        />
        <Stack.Screen
          name="license"
          options={{
            title: tHelper("settingsLicenseTitle"),
            headerTitle: tHelper("settingsLicenseTitle"),
            // One way out only: Done, at the bottom of the screen.
            headerBackVisible: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="type1Settings"
          options={{
            title: tHelper("type1"),
            headerTitle: tHelper("type1"),
            headerBackTitle: tHelper("settings"),
          }}
        />
        <Stack.Screen
          name="type2Settings"
          options={{
            title: tHelper("type2"),
            headerTitle: tHelper("type2"),
            headerBackTitle: tHelper("settings"),
          }}
        />
        <Stack.Screen
          name="autofillSettings"
          options={{
            title: tHelper("autofillSettings"),
            headerTitle: tHelper("autofillSettings"),
            headerBackTitle: tHelper("settings"),
          }}
        />
        <Stack.Screen
          name="calibrationScreen"
          options={{ title: "Calibrate Contactless", headerShown: false }}
        />
      </Stack>
    </>
  );
}
