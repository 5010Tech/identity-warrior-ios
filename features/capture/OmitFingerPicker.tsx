import { Button } from "@/components/Button";
import { Text, useThemeColor } from "@/components/themed";
import { tHelper, translationKey } from "@/translations/translationHelper";
import { FGP } from "@/types/BiometricData";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface OmitFingerPickerProps {
  /** The fingers of the capture that was stopped; null keeps this closed. */
  fingers: FGP[] | null;
  /** The fingers to leave out; an empty list means none (capture again). */
  onDone: (omitted: FGP[]) => void;
}

/**
 * Choosing which fingers to leave out of a scanner capture, as on the Android
 * app's omit screen: every finger starts green (to be captured), and tapping
 * one turns it red (omitted). The capture has already been stopped; it starts
 * again for the fingers left green. Why each one is missing is asked at the
 * review, print by print.
 */
export const OmitFingerPicker = ({ fingers, onDone }: OmitFingerPickerProps) => {
  const insets = useSafeAreaInsets();
  const background = useThemeColor({}, "background");
  const strong = useThemeColor({}, "textStrong");
  const muted = useThemeColor({}, "textSecondary");
  const stroke = useThemeColor({}, "strokeStrong");
  const keep = useThemeColor({}, "success");
  const drop = useThemeColor({}, "danger");
  const [omitted, setOmitted] = useState<FGP[]>([]);

  // A fresh choice each time it opens.
  useEffect(() => {
    if (fingers) setOmitted([]);
  }, [fingers]);

  const toggle = (fgp: FGP) =>
    setOmitted((current) =>
      current.includes(fgp)
        ? current.filter((f) => f !== fgp)
        : [...current, fgp],
    );

  return (
    <Modal
      visible={!!fingers}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => onDone([])}
    >
      <View
        style={[
          styles.screen,
          {
            backgroundColor: background,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <Text style={[styles.title, { color: strong }]}>
          {tHelper("omitFingers")}
        </Text>
        <Text style={[styles.hint, { color: muted }]}>
          {tHelper("omitPickPrompt")}
        </Text>
        <View style={styles.tiles}>
          {(fingers ?? []).map((fgp) => {
            const out = omitted.includes(fgp);
            return (
              <Pressable
                key={fgp}
                style={[styles.tile, { borderColor: out ? drop : stroke }]}
                accessibilityRole="button"
                accessibilityState={{ selected: out }}
                onPress={() => toggle(fgp)}
              >
                <MaterialCommunityIcons
                  name={out ? "fingerprint-off" : "fingerprint"}
                  size={72}
                  color={out ? drop : keep}
                />
                <Text style={[styles.name, { color: strong }]}>
                  {tHelper(String(fgp) as translationKey)}
                </Text>
                <Text style={[styles.state, { color: out ? drop : keep }]}>
                  {tHelper(out ? "omitted" : "omitWillCapture")}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.buttons}>
          <Button
            text={tHelper("cancel")}
            variant="secondary"
            style={styles.button}
            onPress={() => onDone([])}
          />
          <Button
            text={tHelper("omitFingers")}
            style={styles.button}
            disabled={!omitted.length}
            onPress={() => onDone(omitted)}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  hint: { fontSize: 16, textAlign: "center" },
  tiles: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignContent: "center",
    gap: 12,
  },
  tile: {
    width: "46%",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 14,
    gap: 4,
  },
  name: { fontSize: 17, fontWeight: "600", textAlign: "center" },
  state: { fontSize: 14, fontWeight: "700", textTransform: "uppercase" },
  buttons: { flexDirection: "row", gap: 10 },
  button: { flex: 1, width: "auto", paddingHorizontal: 6 },
});
