import React from "react";
import { Stack } from "expo-router";
import { KeyboardAvoidingView, Platform } from "react-native";
import { tHelper } from "@/translations/translationHelper";

export default function SettingsLayout() {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <Stack>
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
          options={{ title: "App Settings", headerTitle: "App Settings" }}
        />
        <Stack.Screen
          name="autofillSettings"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="calibrationScreen"
          options={{ title: "Calibrate Contactless", headerShown: false }}
        />
      </Stack>
    </KeyboardAvoidingView>
  );
}
