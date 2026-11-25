import { AppLogo100 } from "@/components/AppLogo";
import { Text, useThemeColor } from "@/components/themed";
import { tHelper } from "@/translations/translationHelper";
import { PropsWithChildren, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  checkStoredLicense,
  LicenseProblem,
  LicenseRecord,
  watchLicense,
} from "./license";
import { LicensePanel, PROBLEM_TEXT } from "./LicensePanel";

let current: LicenseRecord | undefined;
const recordListeners = new Set<() => void>();

/** The license in force, for what it switches on or off (latent capture). */
export const useLicense = () => {
  const [record, setRecord] = useState(current);
  useEffect(() => {
    const update = () => setRecord(current);
    recordListeners.add(update);
    update();
    return () => {
      recordListeners.delete(update);
    };
  }, []);
  return record;
};

/**
 * Locks the app until a valid license is in, as the Android app does: in
 * place of the app it shows the license screen, with this device's ID (for a
 * license made out to it), Import License and Download License.
 */
export function LicenseGate({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const background = useThemeColor({}, "background");
  const strong = useThemeColor({}, "textStrong");
  const muted = useThemeColor({}, "textSecondary");
  const danger = useThemeColor({}, "danger");

  // null while the stored license is being read, so nothing flashes.
  const [problem, setProblem] = useState<LicenseProblem | "missing" | null>(
    null,
  );

  const check = useCallback(() => {
    checkStoredLicense()
      .then((result) => {
        current = result.problem === "none" ? result.record : undefined;
        recordListeners.forEach((listener) => listener());
        setProblem(result.problem);
      })
      .catch(() => setProblem("missing"));
  }, []);

  useEffect(() => {
    check();
    // A new license imported from Settings counts at once.
    const stopWatching = watchLicense(check);
    // A license can run out while the app sits in the background.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => {
      stopWatching();
      subscription.remove();
    };
  }, [check]);

  if (problem === "none") return <>{children}</>;

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[
        styles.screen,
        {
          backgroundColor: background,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      {problem === null ? (
        <ActivityIndicator color={muted} style={styles.loading} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logo}>
            <AppLogo100 />
          </View>
          <Text style={[styles.title, { color: strong }]}>
            {tHelper("licenseActivateTitle")}
          </Text>
          <Text style={[styles.message, { color: muted }]}>
            {tHelper("licenseRequired")}
          </Text>
          {problem !== "missing" && (
            <Text style={[styles.message, { color: danger }]}>
              {tHelper(PROBLEM_TEXT[problem])}
            </Text>
          )}
          <LicensePanel onImported={check} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 18 },
  loading: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", gap: 14 },
  logo: { alignItems: "center" },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center" },
  message: { fontSize: 16, textAlign: "center" },
});
