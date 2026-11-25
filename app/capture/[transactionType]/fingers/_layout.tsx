import React from "react";
import { Stack } from "expo-router";

// No slide-out menu and no title bar: the scanner is picked on the Capture
// screen, the capture sequence is set in App Settings, and the room goes to
// the prints. Done at the bottom is the way out.
export default function FingerCaptureLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, orientation: "portrait" }} />
  );
}
