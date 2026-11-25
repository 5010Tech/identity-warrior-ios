import { SafeAreaView } from "@/components/themed";
import { useLicense } from "@/features/license/LicenseGate";
import { LicensePanel } from "@/features/license/LicensePanel";
import { tHelper } from "@/translations/translationHelper";
import { Button } from "@/components/Button";
import { useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

/**
 * Settings > Application License: when the license in force runs out, this
 * device's ID, and a new license to replace it (a file, or a download).
 */
export default function LicenseSettingsScreen() {
  const license = useLicense();
  const router = useRouter();

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <LicensePanel
          expiration={license?.expiration}
          allowLatent={license?.allowLatent}
          onImported={() =>
            Alert.alert(
              tHelper("settingsLicenseTitle"),
              tHelper("licenseImported"),
            )
          }
        />
      </ScrollView>
      <View style={styles.footer}>
        <Button text={tHelper("done")} onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  footer: { paddingHorizontal: 12, paddingVertical: 8 },
  content: { gap: 10, padding: 12 },
});
