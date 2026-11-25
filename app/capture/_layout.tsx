import { HeaderBackButton } from "@/components/navigation";
import { CaptureProvider } from "@/features/capture/context/CaptureProvider";
import { tHelper } from "@/translations/translationHelper";
import { Stack } from "expo-router";

export default function CaptureScreenLayout() {
  return (
    <CaptureProvider>
      <Stack screenOptions={{ headerShown: false, orientation: "portrait" }}>
        <Stack.Screen name="[transactionType]/index" />
        <Stack.Screen name="[transactionType]/biographics" />
        <Stack.Screen
          name="[transactionType]/face"
          options={{
            headerShown: true,
            headerTitle: tHelper("captureFace"),
            // No Back here: Done at the bottom is the way out.
            headerBackVisible: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen name="[transactionType]/fingers" />
        <Stack.Screen name="[transactionType]/iris" />
        <Stack.Screen
          name="[transactionType]/smt/index"
          options={{
            headerShown: true,
            headerTitle: tHelper("smts"),
            headerLeft: () => <HeaderBackButton />,
          }}
        />
        <Stack.Screen
          name="[transactionType]/smt/edit"
          options={{
            headerShown: true,
            headerTitle: tHelper("smts"),
            headerLeft: () => <HeaderBackButton />,
          }}
        />
        <Stack.Screen
          name="[transactionType]/palm"
          options={{
            headerShown: true,
            headerTitle: tHelper("capturePalm"),
            // No Back here: Done at the bottom is the way out.
            headerBackVisible: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="[transactionType]/voice"
          options={{
            headerShown: true,
            headerTitle: tHelper("captureVoice"),
            headerLeft: () => <HeaderBackButton />,
          }}
        />
      </Stack>
    </CaptureProvider>
  );
}
