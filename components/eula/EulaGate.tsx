import { Button } from "@/components/Button";
import { Text, useThemeColor } from "@/components/themed";
import { EULA_BLOCKS } from "@/constants/eula";
import { tHelper } from "@/translations/translationHelper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORAGE_KEY = "eulaAccepted";

const listeners = new Set<() => void>();

// Lets what follows the EULA on first launch (the export passcode setup) wait
// for it, so two full-screen sheets never open at once.
let eulaAccepted: boolean | null = null;
const acceptedListeners = new Set<(accepted: boolean) => void>();
const announce = (accepted: boolean) => {
  eulaAccepted = accepted;
  acceptedListeners.forEach((listener) => listener(accepted));
};
/** Calls back with whether the EULA is accepted, now and whenever it changes. */
export const watchEulaAccepted = (listener: (accepted: boolean) => void) => {
  acceptedListeners.add(listener);
  if (eulaAccepted !== null) listener(eulaAccepted);
  return () => {
    acceptedListeners.delete(listener);
  };
};

/** Opens the EULA again (double-tap on the Capture-screen logo). */
export const showEula = () => listeners.forEach((listener) => listener());

/**
 * The End-User License Agreement, as in the Android app: shown on first launch
 * and again on request, and the app can't be used until it is accepted. iOS
 * apps can't close themselves, so Decline keeps the agreement on screen.
 */
export function EulaGate() {
  // null until the saved answer has been read, so the EULA never flashes.
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [requested, setRequested] = useState(false);
  const insets = useSafeAreaInsets();
  const background = useThemeColor({}, "background");
  const strong = useThemeColor({}, "textStrong");
  const text = useThemeColor({}, "text");
  const divider = useThemeColor({}, "divider");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        setAccepted(value === "true");
        announce(value === "true");
      })
      .catch(() => {
        setAccepted(false);
        announce(false);
      });
    const open = () => setRequested(true);
    listeners.add(open);
    return () => {
      listeners.delete(open);
    };
  }, []);

  const accept = () => {
    AsyncStorage.setItem(STORAGE_KEY, "true").catch(console.error);
    setAccepted(true);
    setRequested(false);
    announce(true);
  };

  const decline = () => {
    AsyncStorage.setItem(STORAGE_KEY, "false").catch(console.error);
    setAccepted(false);
    announce(false);
    Alert.alert(tHelper("eulaDeclinedTitle"), tHelper("eulaDeclinedMessage"));
  };

  return (
    <Modal
      visible={accepted === false || requested}
      animationType="fade"
      presentationStyle="fullScreen"
      // Not dismissable: only Accept closes it.
      onRequestClose={() => undefined}
    >
      <View
        style={[
          styles.screen,
          {
            backgroundColor: background,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <Text style={[styles.title, { color: strong }]}>
          {tHelper("eulaTitle")}
        </Text>
        <ScrollView
          style={[styles.scroll, { borderColor: divider }]}
          contentContainerStyle={styles.content}
        >
          {EULA_BLOCKS.map((block, index) => (
            <Text
              key={index}
              style={[
                block.heading ? styles.heading : styles.paragraph,
                { color: block.heading ? strong : text },
              ]}
            >
              {block.runs.map((run, i) => (
                <Text
                  key={i}
                  style={[
                    run.bold && styles.bold,
                    run.underline && styles.underline,
                  ]}
                >
                  {run.text}
                </Text>
              ))}
            </Text>
          ))}
        </ScrollView>
        <View style={styles.buttons}>
          <View style={styles.button}>
            <Button
              text={tHelper("eulaDecline")}
              variant="secondary"
              onPress={decline}
            />
          </View>
          <View style={styles.button}>
            <Button text={tHelper("eulaAccept")} onPress={accept} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  scroll: { flex: 1, borderTopWidth: 1, borderBottomWidth: 1 },
  content: { paddingVertical: 14, gap: 12 },
  heading: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  paragraph: { fontSize: 16, lineHeight: 23 },
  bold: { fontWeight: "700" },
  underline: { textDecorationLine: "underline" },
  buttons: { flexDirection: "row", gap: 12 },
  button: { flex: 1 },
});
