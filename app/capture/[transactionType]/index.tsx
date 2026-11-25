import { logEvent } from "@/util/fieldLog";
import { clearRecovery, suspendRecovery } from "@/features/capture/recovery";
import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { Button } from "@/components/Button";
import { AppLogo100 } from "@/components/AppLogo";
import { Spinner } from "@/components/Spinner";
import { Col, Row } from "@/components/Structure";
import { H2, SafeAreaView, View } from "@/components/themed";
import { BiographicData, Iris } from "@/types";
import { hasMissingIrisReason } from "@/types/util";
import { TransactionType } from "@/types/Transaction";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import Constants from "expo-constants";
import { buildEbts, DodBiographics, DodTot } from "@/features/ebts/buildEbts";
import { makeThumbnail, readFileBase64 } from "@/features/ebts/saveEbts";
import { DodSubmission, storeSubmission } from "@/features/ebts/vault";
import { sendSubmission } from "@/features/ebts/sendSubmission";
import { useActiveDevice } from "@/components/device/activeDevice";
import { supportsIrisCapture } from "@/features/capture/util";
import ExpoIdentifiModule from "@/modules/expo-identifi/src/ExpoIdentifiModule";
import {
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  View as RNView,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useThemeColor } from "@/components/themed";
import { tHelper } from "@/translations/translationHelper";
import { useSubmissionActions } from "@/components/submissions";
import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { CaptureStepButton } from "@/features/capture/CaptureStepButton";
import {
  useCaptureValue,
  useCaptureActions,
} from "@/features/capture/context/hooks";
import { CaptureState } from "@/features/capture/types";

const requiredIrisEyes = ["left", "right"] as const;

const isIrisCaptureComplete = (irises: Iris[]) =>
  requiredIrisEyes.every((eyePosition) => {
    const iris = irises.find((item) => item.eyePosition === eyePosition);
    return Boolean(iris?.image || hasMissingIrisReason(iris));
  });

/** DoD transaction names for the screen title, by the `dodTot` route param. */
const dodTitles: Record<string, "dprs" | "map" | "car"> = {
  dprs: "dprs",
  map: "map",
  car: "car",
};

export default function CaptureScreen() {
  const { transactionType, dodTot } = useLocalSearchParams<{
    dodTot?: string;
    transactionType: TransactionType;
  }>();

  const router = useRouter();

  const {
    biographicsComplete,
    transaction,
    biographicsEnabled,
    faceEnabled,
    fingersEnabled,
    irisEnabled,
    smts,
    voice,
    palms,
    rolledFingers,
    slaps,
    restoring,
  } = useCaptureValue<CaptureState>();
  const { setEnabled } = useCaptureActions();
  const { getValue, createTCN } = useAutofill();
  const { addSubmission } = useSubmissionActions();
  const [fetching, setFetching] = useState(false);
  const flatsComplete: boolean = useAutofillSelector(
    (s) =>
      transaction.fingers.length >=
      (s.appSettings.collectionMode !== "DHS" ||
      s.appSettings.fingerprintCaptureSequence === "tenFlat"
        ? 10
        : 2),
  );

  // The on/off switches beside each capture step are a DHS feature. In DoD
  // mode they are hidden and every step is available.
  const { setValue: setCaptureValue } = useCaptureActions();
  // Let the capture screens below (biographics) know which DoD transaction this is.
  useEffect(() => {
    setCaptureValue("dodTot", dodTot);
  }, [dodTot, setCaptureValue]);

  const isDod = useAutofillSelector(
    (s) => s.appSettings.collectionMode !== "DHS",
  );

  // Iris needs a connected scanner with an iris camera (IdentiFI 45i / 50i);
  // without one the step isn't shown and can't hold up the submission.
  const { activeDevice } = useActiveDevice();
  // MAP and CAR on a scanner also take every finger rolled (as on Android):
  // each finger with a flat print needs its rolled print too.
  const needsRolled =
    isDod &&
    ["map", "car"].includes((dodTot ?? "").toLowerCase()) &&
    activeDevice?.connectionType === "wifi";
  const fingerprintCaptureComplete =
    flatsComplete &&
    (!needsRolled ||
      transaction.fingers
        .filter((finger) => !finger.missingFingerprints?.length)
        .every((finger) =>
          (rolledFingers ?? []).some(
            (rolled) =>
              Number(rolled.fingerPosition) === Number(finger.fingerPosition),
          ),
        ));
  const irisAvailable = supportsIrisCapture(activeDevice?.modelNumber);

  // With a Wi-Fi scanner in use, get it ready now, in the background, rather
  // than when its first capture is asked for: connecting and powering on the
  // iris camera each take ten seconds or more. It is released again when the
  // collection screen closes.
  const scannerSsid =
    activeDevice?.connectionType === "wifi" ? activeDevice.ssid : undefined;
  // Until that connection is up (or has failed), the scanner's capture steps
  // are held back in DoD mode: started too early, the scanner is not ready.
  const [scannerConnecting, setScannerConnecting] = useState(false);
  useEffect(() => {
    if (!scannerSsid) return;
    let live = true;
    setScannerConnecting(true);
    void ExpoIdentifiModule.warmUp(irisAvailable).finally(() => {
      if (live) setScannerConnecting(false);
    });
    return () => {
      live = false;
      setScannerConnecting(false);
    };
  }, [scannerSsid, irisAvailable]);
  const scannerBusy = isDod && scannerConnecting;
  // Leaving the app (to change Wi-Fi, say) with the scanner still connected
  // strands it: the phone drops off its network without a goodbye, and the
  // scanner then refuses every new connection until it is power-cycled. So
  // the scanner is released properly when the app is left, unless a capture
  // is running, and connected again on the way back.
  useEffect(() => {
    if (!scannerSsid) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let released = false;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (timer) clearTimeout(timer);
        timer = null;
        if (released) {
          released = false;
          logEvent("scanner", "app is back: connecting to the scanner again");
          setScannerConnecting(true);
          void ExpoIdentifiModule.warmUp(irisAvailable).finally(() =>
            setScannerConnecting(false),
          );
        }
        return;
      }
      if (timer || released) return;
      // In the background at once; merely covered (Control Center, a
      // notification) only if it lasts.
      timer = setTimeout(
        () => {
          timer = null;
          if (ExpoIdentifiModule.isCapturing()) return;
          released = true;
          logEvent("scanner", "app left: releasing the scanner");
          void ExpoIdentifiModule.endSession();
        },
        state === "background" ? 0 : 3000,
      );
    });
    return () => {
      subscription.remove();
      if (timer) clearTimeout(timer);
    };
  }, [scannerSsid, irisAvailable]);
  useEffect(
    () => () => {
      void ExpoIdentifiModule.endSession();
    },
    [],
  );

  // App Settings > Allow Contactless Palm Collection (DoD).
  const allowPalm = useAutofillSelector(
    (s) => s.appSettings.allowContactlessPalm === true,
  );

  // Six or seven steps (iris and/or palm on top of the DoD ones) get the
  // tighter layout so everything still fits on smaller iPhones.
  const stepCount =
    3 + (irisAvailable ? 1 : 0) + (isDod ? 2 + (allowPalm ? 1 : 0) : 0);
  const compact = stepCount >= 6;

  const danger = useThemeColor({}, "danger");
  const dangerBg = useThemeColor({}, "dangerBg");

  const irisCaptureComplete = isIrisCaptureComplete(transaction.irises);

  /**
   * DoD mode: builds the EBTS file for this collection, stores it encrypted
   * on the phone and goes to Submissions. Getting a plain .eft out is an
   * export from there, behind the export passcode.
   */
  const saveDodTransaction = async () => {
    try {
      setFetching(true);
      const file = buildEbts({
        tot: (dodTot ?? "dprs").toUpperCase() as DodTot,
        type1: getValue("type1Settings") ?? {},
        biographics: (transaction.biographicData ?? {}) as DodBiographics,
        faces: transaction.faces ?? [],
        fingers: transaction.fingers ?? [],
        // MAP and CAR on a scanner: slaps whole, flat thumbs as plain thumbs.
        // A two-finger platen (45I) has no slaps: its flats are each finger's
        // own plain print, thumbs included, so they keep positions 1 and 6.
        slaps: needsRolled ? (slaps ?? {}) : {},
        plainThumbs: needsRolled && !!Object.keys(slaps ?? {}).length,
        // Rolled prints only for fingers whose flat print was taken.
        rolledFingers: needsRolled
          ? (rolledFingers ?? []).filter((rolled) =>
              transaction.fingers.some(
                (finger) =>
                  Number(finger.fingerPosition) ===
                    Number(rolled.fingerPosition) &&
                  !finger.missingFingerprints?.length,
              ),
            )
          : [],
        irises: irisAvailable ? (transaction.irises ?? []) : [],
        smts: smts ?? [],
        palms: palms ?? [],
        voice: voice?.uri
          ? {
              base64: await readFileBase64(voice.uri),
              seconds: (voice.durationMillis ?? 0) / 1000,
            }
          : null,
        appVersion: Constants.expoConfig?.version,
      });
      logEvent(
        "submit",
        `built ${(dodTot ?? "dprs").toUpperCase()}: ${transaction.faces?.length ?? 0} face, ` +
          `${transaction.fingers?.filter((f) => !f.missingFingerprints?.length).length ?? 0} finger ` +
          `(${transaction.fingers?.filter((f) => f.missingFingerprints?.length).length ?? 0} omitted), ` +
          `${needsRolled ? (rolledFingers?.length ?? 0) : 0} rolled, ` +
          `${smts?.length ?? 0} smt, ${palms?.length ?? 0} palm, voice ${voice?.uri ? "yes" : "no"}`,
      );
      const bio = (transaction.biographicData ?? {}) as DodBiographics;
      const frontal =
        transaction.faces?.find((face) => face.pose === "F") ??
        transaction.faces?.[0];
      const stored: DodSubmission = {
          tcn: file.tcn,
          tot: (dodTot ?? "dprs").toUpperCase(),
          name:
            [bio.lastName, bio.firstName].filter(Boolean).join(", ") ||
            tHelper("unknown"),
          createdAt: new Date().toISOString(),
          thumbnail: await makeThumbnail(frontal?.image),
      };
      await storeSubmission(
        stored,
        file.bytes,
      );
      // Safe in the vault: the collection no longer needs recovering, and
      // nothing more is saved for this one.
      suspendRecovery(true);
      await clearRecovery("submitted");
      // Off to BioCore in the background when that is the ABIS in settings;
      // the card in Submissions shows how it went and offers a resend.
      void sendSubmission(stored);
      // Stored: on to Submissions, leaving the finished collection behind.
      router.dismissAll();
      router.navigate("/submissions");
    } catch (error) {
      console.error("EBTS generation failed", error);
      Alert.alert(tHelper("ebtsError"), String(error));
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (isDod) return saveDodTransaction();
    try {
      setFetching(true);
      const submissionSettings = getValue("submissionSettings");

      if (!submissionSettings) throw new Error(tHelper("submissionSettingsErr"));

      const tcn = createTCN();
      const body = {
        ...transaction,
        ...submissionSettings,
        fingers: fingersEnabled ? transaction.fingers : [],
        irises: irisEnabled ? transaction.irises : [],
        biographicData: biographicsEnabled
          ? transaction.biographicData
          : ({
              firstName: "",
              lastName: "",
              dob: "",
              sex: "U",
              race: "",
              citizenship: "",
              birthCountry: "",
              eyeColor: "",
              collectionReason: "",
              hairColor: "",
              documents: [],
            } as BiographicData),
        tcn,
      };

      await addSubmission(body);
    } catch (error) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  // Like the Android app: leaving a collection always asks first, because
  // everything captured so far is lost.
  const handleBack = () => {
    Alert.alert(tHelper("exitCollection"), tHelper("leaveCollection"), [
      { text: tHelper("cancel"), style: "cancel" },
      {
        text: tHelper("exitCollection"),
        style: "destructive",
        onPress: () => {
          // Left on purpose, as on Android: there is nothing to recover.
          suspendRecovery(true);
          void clearRecovery("the collection was left");
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      {fetching && <Spinner />}
      {restoring && <Spinner message={tHelper("recoveringCollection")} />}
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <AppLogo100
            style={compact ? styles.iconCompact : styles.iconStyle}
            resizeMode="contain"
          />
        </View>
        {/* The steps share the height between the logo and the buttons, so the
            screen fits without scrolling however many steps there are. */}
        <View style={[styles.steps, compact && styles.stepsCompact]}>
        <CaptureStepButton
          compact={compact}
          icon="vcard-o"
          path="/capture/[transactionType]/biographics"
          title={tHelper("bioData")}
          completed={!!biographicsComplete}
          enabled={biographicsEnabled}
          onEnabledChange={(enabled) =>
            setEnabled("biographicsEnabled", enabled)
          }
          canToggle={false}
        />
        <CaptureStepButton
          compact={compact}
          icon="user"
          path="/capture/[transactionType]/face"
          title={tHelper("captureFace")}
          completed={!!transaction.faces.length}
          enabled={isDod || faceEnabled}
          onEnabledChange={(enabled) => setEnabled("faceEnabled", enabled)}
          canToggle={!isDod && ["Identify", "Verify"].includes(transactionType)}
        />
        <CaptureStepButton
          compact={compact}
          icon="fingerprint"
          path="/capture/[transactionType]/fingers"
          title={tHelper("captureFinger")}
          busy={scannerBusy}
          completed={fingerprintCaptureComplete}
          enabled={isDod || fingersEnabled}
          onEnabledChange={(enabled) => setEnabled("fingersEnabled", enabled)}
          canToggle={!isDod && ["Identify", "Verify"].includes(transactionType)}
        />
        {irisAvailable && (
          <CaptureStepButton
          compact={compact}
            icon="eye"
            path="/capture/[transactionType]/iris"
            title={tHelper("captureIris")}
            busy={scannerBusy}
            completed={irisCaptureComplete}
            enabled={isDod || irisEnabled}
            onEnabledChange={(enabled) => setEnabled("irisEnabled", enabled)}
            canToggle={!isDod}
          />
        )}
        {isDod && (
          <>
            {/* Optional in DoD collections: no mark until something is collected. */}
            {allowPalm && (
              <CaptureStepButton
          compact={compact}
                icon="hand-back-left-outline"
                path="/capture/[transactionType]/palm"
                title={tHelper("capturePalm")}
                completed={!!palms?.length}
                optional
              />
            )}
            <CaptureStepButton
          compact={compact}
              icon="bandage"
              path="/capture/[transactionType]/smt"
              title={tHelper("smts")}
              completed={!!smts?.length}
              optional
            />
            <CaptureStepButton
          compact={compact}
              icon="microphone"
              path="/capture/[transactionType]/voice"
              title={tHelper("captureVoice")}
              completed={!!voice}
              optional
            />
          </>
        )}
        </View>
        <RNView style={styles.actions}>
          {/* Cancel: a small red-tinted circle with an X, so Submit gets the width. */}
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={tHelper("cancel")}
            hitSlop={6}
            style={({ pressed }) => [
              styles.cancel,
              { backgroundColor: dangerBg, borderColor: danger },
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons name="close" size={30} color={danger} />
          </Pressable>
          <Button
            text={tHelper("submitTransaction")}
            icon="send"
            onPress={handleSubmit}
            style={styles.submit}
            textStyle={styles.submitText}
            disabled={
              (fingersEnabled && !fingerprintCaptureComplete) ||
              (faceEnabled && !transaction.faces.length) ||
              (biographicsEnabled && !biographicsComplete) ||
              (irisAvailable && irisEnabled && !irisCaptureComplete)
            }
          />
        </RNView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 12,
  },
  titleContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
  },
  iconStyle: {
    height: 64,
    width: 70,
  },
  iconCompact: {
    height: 46,
    width: 50,
  },
  steps: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    gap: 12,
  },
  stepsCompact: {
    gap: 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 12,
    marginTop: 10,
  },
  cancel: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
  // Button is full width by default; here it takes what the Cancel button leaves.
  submit: { flex: 1, width: "auto", minHeight: 64 },
  submitText: { fontSize: 20, fontWeight: "700" },

});
