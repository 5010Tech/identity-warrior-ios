import { Stack } from "expo-router";

export default function SubmissionScreenLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[tcn]/index" />
    </Stack>
  );
}
