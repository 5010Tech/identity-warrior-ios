import React from "react";
import { Stack } from "expo-router";
import { tHelper } from "@/translations/translationHelper";

// No slide-out menu here: iris collection is only offered when a supported
// iris device is already connected, so there is nothing to pick on the way in.
// A title bar like the palm, SMT and voice screens, without Back.
export default function IrisLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, orientation: "portrait" }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTitle: tHelper("captureIris"),
          // No Back here: Done at the bottom is the way out.
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen name="capture" />
    </Stack>
  );
}
