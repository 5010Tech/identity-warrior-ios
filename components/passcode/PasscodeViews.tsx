import { logEvent } from "@/util/fieldLog";
import { Button } from "@/components/Button";
import { Text, useThemeColor } from "@/components/themed";
import { watchEulaAccepted } from "@/components/eula/EulaGate";
import {
  checkExportPasscode,
  hasExportPasscode,
  isValidPasscode,
  saveExportPasscode,
  watchPasscodeCleared,
} from "@/features/ebts/exportPasscode";
import { tHelper } from "@/translations/translationHelper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** A 4 to 6 digit passcode box: number pad, dots instead of digits. */
const PasscodeInput = ({
  label,
  value,
  onChange,
  error,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}) => {
  const text = useThemeColor({}, "textStrong");
  const muted = useThemeColor({}, "textMuted");
  const stroke = useThemeColor({}, "strokeStrong");
  const surface = useThemeColor({}, "surface");
  const danger = useThemeColor({}, "danger");
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(next) => onChange(next.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        autoFocus={autoFocus}
        style={[
          styles.input,
          {
            color: text,
            backgroundColor: surface,
            borderColor: error ? danger : stroke,
          },
        ]}
      />
      {!!error && <Text style={[styles.error, { color: danger }]}>{error}</Text>}
    </View>
  );
};

/**
 * Create Export Passcode, as on Android (passcode_setup.xml): shown at
 * startup until a passcode exists, once the EULA has been accepted. Exports
 * are locked behind this passcode, so it can't be skipped.
 */
export function PasscodeGate() {
  const insets = useSafeAreaInsets();
  const background = useThemeColor({}, "background");
  const strong = useThemeColor({}, "textStrong");
  const text = useThemeColor({}, "text");
  const accent = useThemeColor({}, "accent");
  const [needed, setNeeded] = useState(false);
  const [eulaAccepted, setEulaAccepted] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [verify, setVerify] = useState("");
  const [errors, setErrors] = useState<{ passcode?: string; verify?: string }>(
    {},
  );

  useEffect(() => {
    hasExportPasscode()
      .then((exists) => setNeeded(!exists))
      .catch(() => setNeeded(true));
    const stopEula = watchEulaAccepted(setEulaAccepted);
    // Clear Secure Data removes the passcode: ask for a new one.
    const stopCleared = watchPasscodeCleared(() => {
      setPasscode("");
      setVerify("");
      setErrors({});
      setNeeded(true);
    });
    return () => {
      stopEula();
      stopCleared();
    };
  }, []);

  const save = async () => {
    const next: typeof errors = {};
    if (!passcode) next.passcode = tHelper("valueRequired");
    else if (!isValidPasscode(passcode)) next.passcode = tHelper("passcodeDigits");
    if (!verify) next.verify = tHelper("valueRequired");
    else if (passcode !== verify) next.verify = tHelper("passcodeMismatch");
    setErrors(next);
    if (next.passcode || next.verify) return;
    try {
      await saveExportPasscode(passcode);
      logEvent("passcode", "export passcode created");
      setNeeded(false);
    } catch (error) {
      console.error("Could not save the export passcode", error);
      setErrors({ passcode: tHelper("passcodeFail") });
    }
  };

  return (
    <Modal
      visible={needed && eulaAccepted}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.screen, { backgroundColor: background }]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.setup,
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <MaterialCommunityIcons name="lock-outline" size={64} color={accent} />
          <Text style={[styles.title, { color: strong }]}>
            {tHelper("passcodeSetupTitle")}
          </Text>
          <Text style={[styles.body, { color: text }]}>
            {tHelper("exportAlert")}
          </Text>
          <PasscodeInput
            label={tHelper("passcodeEnter")}
            value={passcode}
            onChange={setPasscode}
            error={errors.passcode}
          />
          <PasscodeInput
            label={tHelper("passcodeVerify")}
            value={verify}
            onChange={setVerify}
            error={errors.verify}
          />
          <Button
            text={tHelper("savePasscode")}
            icon="content-save-outline"
            style={styles.wide}
            onPress={save}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** "Please Enter Your Export Passcode", before anything is exported. */
export function PasscodePrompt({
  visible,
  onCancel,
  onUnlocked,
}: {
  visible: boolean;
  onCancel: () => void;
  onUnlocked: () => void;
}) {
  const surface = useThemeColor({}, "surface");
  const strong = useThemeColor({}, "textStrong");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (visible) {
      setPasscode("");
      setError(undefined);
    }
  }, [visible]);

  const submit = async () => {
    if (await checkExportPasscode(passcode)) onUnlocked();
    else {
      logEvent("passcode", "incorrect export passcode entered");
      setError(tHelper("incorrectPasscode"));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.dialog, { backgroundColor: surface }]}>
          <Text style={[styles.dialogTitle, { color: strong }]}>
            {tHelper("enterPasscode")}
          </Text>
          <PasscodeInput
            label={tHelper("exportPasscode")}
            value={passcode}
            onChange={setPasscode}
            error={error}
            autoFocus
          />
          <View style={styles.row}>
            <Button
              variant="secondary"
              text={tHelper("cancel")}
              style={styles.grow}
              onPress={onCancel}
            />
            <Button
              text={tHelper("export")}
              icon="export-variant"
              style={styles.grow}
              onPress={submit}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  setup: { alignItems: "center", gap: 16, paddingHorizontal: 24 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  body: { fontSize: 15, lineHeight: 21, textAlign: "center" },
  field: { alignSelf: "stretch", gap: 6 },
  label: { fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 8,
    textAlign: "center",
  },
  error: { fontSize: 13, fontWeight: "600" },
  wide: { alignSelf: "stretch", marginTop: 8 },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  dialog: { borderRadius: 18, padding: 20, gap: 16 },
  dialogTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  row: { flexDirection: "row", gap: 10 },
  grow: { flex: 1 },
});
