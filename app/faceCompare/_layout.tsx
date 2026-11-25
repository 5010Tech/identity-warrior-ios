import { Stack } from "expo-router";

export default function FaceCompareLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, orientation: "portrait" }}>
      <Stack.Screen name="new" />
    </Stack>
  );
}
