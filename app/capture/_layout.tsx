import { HeaderBackButton } from "@/components/navigation";
import { CaptureProvider } from "@/features/capture/context/CaptureProvider";
import { tHelper } from "@/translations/translationHelper";
import { Stack } from "expo-router";

export default function CaptureScreenLayout() {
  return (
    <CaptureProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="[transactionType]/index" />
        <Stack.Screen name="[transactionType]/biographics" />
        <Stack.Screen name="[transactionType]/face" />
        <Stack.Screen name="[transactionType]/fingers" />
        <Stack.Screen name="[transactionType]/iris" />
      </Stack>
    </CaptureProvider>
  );
}
