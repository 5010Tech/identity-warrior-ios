import { Stack } from "expo-router";

export default function SubmissionScreenLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, orientation: "portrait" }}>
      <Stack.Screen name="[tcn]/index" />
    </Stack>
  );
}
