import { Button } from "@/components/Button";
import { useActiveDevice } from "@/components/device/activeDevice";
import { SafeAreaView, Text, useThemeColor, View } from "@/components/themed";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Spinner } from "@/components/Spinner";
import ExpoIdentifiModule, {
  irisTrouble,
} from "@/modules/expo-identifi/src/ExpoIdentifiModule";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useCaptureActions,
  useCaptureValue,
} from "@/features/capture/context/hooks";
import { mapIris } from "@/features/capture/context/util";
import {
  isIrisComplete,
  missingReason,
  supportsIrisCapture,
  upsertIrises,
} from "@/features/capture/util";
import { tHelper } from "@/translations/translationHelper";
import { Iris, IrisEyePosition } from "@/types";
import { hasMissingIrisReason } from "@/types/util";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Image, Pressable, ScrollView, StyleSheet } from "react-native";

// Right eye first, as on Android.
const requiredEyes: IrisEyePosition[] = ["right", "left"];

/** A capture button: eye icon, what it captures, and a done / to-do mark. */
const IrisCard = ({
  label,
  done,
  disabled,
  onPress,
}: {
  label: string;
  done: boolean;
  disabled: boolean;
  onPress: () => void;
}) => {
  const surface = useThemeColor({}, "surface");
  const stroke = useThemeColor({}, "strokeStrong");
  const text = useThemeColor({}, "textStrong");
  const accent = useThemeColor({}, "accent");
  const success = useThemeColor({}, "success");
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: surface, borderColor: stroke },
        (pressed || disabled) && styles.dim,
      ]}
    >
      <MaterialCommunityIcons name="eye-outline" size={48} color={accent} />
      <Text style={[styles.cardText, { color: text }]}>{label}</Text>
      <MaterialCommunityIcons
        name={done ? "check-circle" : "alert-circle"}
        size={30}
        color={done ? success : accent}
      />
    </Pressable>
  );
};

export default function IrisReviewScreen() {
  const router = useRouter();
  const { transactionType } = useLocalSearchParams<{
    transactionType: string;
  }>();
  const { activeDevice } = useActiveDevice();
  const { setValue, getValue } = useCaptureActions();
  const persistedIrises = useCaptureValue<Iris[]>("transaction.irises");

  const configuredForIris = activeDevice?.connectionType === "wifi";
  const unsupportedModel =
    configuredForIris && !supportsIrisCapture(activeDevice?.modelNumber)
      ? activeDevice?.modelNumber
      : undefined;

  const localCompletion = isIrisComplete(persistedIrises);
  const canCapture = configuredForIris && !unsupportedModel;
  const irisFor = (eyePosition: IrisEyePosition) =>
    persistedIrises.find((item) => item.eyePosition === eyePosition);

  const surface = useThemeColor({}, "surface");
  const stroke = useThemeColor({}, "stroke");
  const strokeStrong = useThemeColor({}, "strokeStrong");
  const text = useThemeColor({}, "textStrong");
  const muted = useThemeColor({}, "textMuted");
  const danger = useThemeColor({}, "danger");

  /** Opens the live capture. With an eye, only that eye's result is kept. */
  const openCapture = (eye?: IrisEyePosition) =>
    router.navigate({
      pathname: "/capture/[transactionType]/iris/capture",
      params: eye ? { transactionType, eye } : { transactionType },
    });

  // Capture starts on its own the first time in. This screen is what the
  // operator comes back to: the results, or what is still missing if it failed.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    if (canCapture && !persistedIrises.length) openCapture();
    // Only on the way in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset is only offered after an iris capture has gone wrong; checked each
  // time this screen comes back from the capture.
  const [troubled, setTroubled] = useState(irisTrouble.seen);
  useFocusEffect(
    useCallback(() => {
      setTroubled(irisTrouble.seen);
    }, []),
  );

  const [resetting, setResetting] = useState(false);
  const resetScanner = async () => {
    if (resetting) return;
    setResetting(true);
    const answered = await ExpoIdentifiModule.resetSensors().catch(() => false);
    setResetting(false);
    if (answered) {
      irisTrouble.seen = false;
      setTroubled(false);
    }
    Alert.alert(
      tHelper("irisReset"),
      tHelper(answered ? "scannerResetDone" : "scannerResetFailed"),
    );
  };

  const updateEyeSelection = (
    eyePosition: IrisEyePosition,
    omitted: boolean,
  ) => {
    const current = getValue<Iris[]>("transaction.irises");
    const retained = current.filter((iris) => iris.eyePosition !== eyePosition);

    if (!omitted) {
      setValue("transaction.irises", retained);
      return;
    }

    setValue(
      "transaction.irises",
      upsertIrises(retained, [
        mapIris({
          eyePosition,
          make: "IdentiFI",
          modelNumber: activeDevice?.modelNumber ?? "UNKNOWN",
          serialNumber: activeDevice?.serialNumber ?? "UNKNOWN",
          missingReason,
        }),
      ]),
    );
  };

  /** Both eyes: any omitted eye is put back in first. */
  const captureBoth = () => {
    requiredEyes.forEach((eyePosition) => {
      if (hasMissingIrisReason(irisFor(eyePosition))) {
        updateEyeSelection(eyePosition, false);
      }
    });
    openCapture();
  };

  /** One eye: put it back in if it was omitted; the other eye is left alone. */
  const captureOne = (eyePosition: IrisEyePosition) => {
    if (hasMissingIrisReason(irisFor(eyePosition))) {
      updateEyeSelection(eyePosition, false);
    }
    openCapture(eyePosition);
  };

  const bothCaptured = requiredEyes.every((eyePosition) => {
    const iris = irisFor(eyePosition);
    return !hasMissingIrisReason(iris) && !!iris?.image;
  });

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            bothCaptured && styles.contentFill,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {!!unsupportedModel && (
            <Text style={[styles.warning, { color: danger }]}>
              {tHelper("irisUnsupportedDevice")}: {unsupportedModel}
            </Text>
          )}

          {/* Gone once both images are in, so the two results fit on the
              screen without scrolling; each eye keeps its own Recapture. */}
          {!bothCaptured && (
            <IrisCard
              label={tHelper("captureBothIrises")}
              done={localCompletion}
              disabled={!canCapture}
              onPress={captureBoth}
            />
          )}

          {requiredEyes.map((eyePosition) => {
            const iris = irisFor(eyePosition);
            const omitted = hasMissingIrisReason(iris);
            const captured = !omitted && !!iris?.image;
            const left = eyePosition === "left";
            return (
              <View
                key={eyePosition}
                style={[
                  styles.result,
                  // With both images in, the two results share the screen.
                  bothCaptured && styles.resultFill,
                  { backgroundColor: surface, borderColor: stroke },
                ]}
              >
                <Text style={[styles.eyeLabel, { color: text }]}>
                  {tHelper(left ? "leftEye" : "rightEye")}
                  {captured && iris?.totalScore != null && (
                    <Text style={{ color: muted }}>
                      {"  "}
                      {tHelper("qualityScore")}
                      {iris.totalScore}
                    </Text>
                  )}
                </Text>
                {captured ? (
                  <Image
                    resizeMode="contain"
                    style={[
                      styles.eyeImage,
                      bothCaptured && styles.eyeImageFill,
                    ]}
                    source={{ uri: `data:image/png;base64,${iris?.image}` }}
                  />
                ) : (
                  <View style={styles.notCaptured}>
                    <MaterialCommunityIcons
                      name="eye-off-outline"
                      size={48}
                      color={strokeStrong}
                    />
                    <Text style={[styles.notCapturedText, { color: muted }]}>
                      {tHelper(omitted ? "irisOmitted" : "irisNotCaptured")}
                    </Text>
                  </View>
                )}
                <View style={styles.resultButtons}>
                  <Button
                    variant={captured ? "secondary" : "primary"}
                    icon={captured ? "camera-retake-outline" : "camera-outline"}
                    text={tHelper(captured ? "recapture" : "capture")}
                    style={styles.resultButton}
                    // With an image in, Recapture is always there to press; if
                    // the scanner cannot be reached the capture screen says so.
                    disabled={!captured && !canCapture}
                    onPress={() => captureOne(eyePosition)}
                  />
                  {/* Omit is for an eye that has not been captured. */}
                  {!omitted && !captured && (
                    <Button
                      variant="secondary"
                      icon="eye-off-outline"
                      text={tHelper("omit")}
                      style={styles.resultButton}
                      onPress={() => updateEyeSelection(eyePosition, true)}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
        {/* As on Android: for an iris sensor that is stuck (still lit or
            blinking, no preview, won't start). */}
        {configuredForIris && troubled && (
          <Button
            variant="secondary"
            icon="restart"
            text={tHelper("irisReset")}
            disabled={resetting}
            onPress={resetScanner}
          />
        )}
        <Button text={tHelper("done")} onPress={() => router.back()} />
      </View>
      {resetting && <Spinner message={tHelper("deviceResetting")} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  scroll: { flex: 1 },
  content: { gap: 10, paddingBottom: 6 },
  contentFill: { flexGrow: 1 },
  resultFill: { flex: 1 },
  // Takes whatever height the card has, never less than the usual size.
  eyeImageFill: { flex: 1, height: undefined, minHeight: 170 },
  warning: { fontWeight: "600" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 76,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  cardText: { flex: 1, fontSize: 18, fontWeight: "600" },
  dim: { opacity: 0.5 },
  result: { gap: 8, padding: 12, borderWidth: 1, borderRadius: 14 },
  eyeLabel: { fontSize: 18, fontWeight: "600" },
  eyeImage: { width: "100%", height: 170 },
  notCaptured: {
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  notCapturedText: { fontSize: 18, fontWeight: "600" },
  resultButtons: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "transparent",
  },
  resultButton: { flex: 1 },
});
