import { Button } from "@/components/Button";
import { useActiveDevice } from "@/components/device/activeDevice";
import { ConnectionFailedDialog } from "@/components/device/ConnectionFailedDialog";
import { SafeAreaView, Text, useThemeColor, View } from "@/components/themed";
import {
  useCaptureActions,
  useCaptureValue,
} from "@/features/capture/context/hooks";
import { mapIris } from "@/features/capture/context/util";
import {
  missingReason,
  requiredEyes,
  supportsIrisCapture,
  upsertIrises,
} from "@/features/capture/util";
import { ExpoIdentifi, ExpoIdentifiView } from "@/modules/expo-identifi";
import ExpoIdentifiModule, {
  irisFrames,
  irisTrouble,
  IrisCaptureResult,
  IrisCaptureStatusEvent,
} from "@/modules/expo-identifi/src/ExpoIdentifiModule";
import { tHelper } from "@/translations/translationHelper";
import { logEvent } from "@/util/fieldLog";
import { Iris, IrisEyePosition } from "@/types";
import { hasMissingIrisReason } from "@/types/util";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet } from "react-native";

/** The preview stopped mid-capture and the scanner went quiet. */
class IrisStalledError extends Error {
  constructor() {
    super("The scanner stopped sending the iris preview");
    this.name = "IrisStalledError";
  }
}

const getOmittedEyes = (irises: Iris[]) => ({
  left: hasMissingIrisReason(
    irises.find((iris) => iris.eyePosition === "left"),
  ),
  right: hasMissingIrisReason(
    irises.find((iris) => iris.eyePosition === "right"),
  ),
});

export default function IrisCaptureScreen() {
  const router = useRouter();
  // Set when one eye is being (re)captured: the scanner still images both
  // eyes, but only this eye's result is kept and the other is left as it was.
  const { eye } = useLocalSearchParams<{ eye?: IrisEyePosition }>();
  const { setValue, getValue } = useCaptureActions();
  const persistedIrises = useCaptureValue<Iris[]>("transaction.irises");
  const {
    activeDevice,
    connecting,
    connectToDevice,
    disconnectFromDevice,
    connectionFailed,
    closeConnectionFailedDialog,
  } = useActiveDevice();

  const [loadingMessage, setLoadingMessage] = useState("");
  const [captureStatusDescription, setCaptureStatusDescription] = useState(
    tHelper("irisPoweringOn"),
  );
  const [captureRunning, setCaptureRunning] = useState(false);
  const [unsupportedModel, setUnsupportedModel] = useState<string>();
  // The irises just captured, waiting on Save Image or Recapture (as on the
  // Android app's iris review). Nothing is stored until Save.
  const [review, setReview] = useState<Iris[] | null>(null);
  // Eyes found: the scanner is taking and sending its images (the preview
  // stops meanwhile), so the wheel shows until the result arrives.
  const [takingImages, setTakingImages] = useState(false);
  const retrievingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasReceivedPreviewFrame, setHasReceivedPreviewFrame] = useState(false);

  const mounted = useRef(true);
  const captureRunningRef = useRef(false);
  const suppressCancelAlert = useRef(false);
  const attemptedAutoStart = useRef(false);
  // Set by Cancel: whatever the start-up is in the middle of, stop there.
  const abandoned = useRef(false);
  // True from the start of a capture until its start command is sent.
  const startingUp = useRef(false);
  // A capture whose preview has stopped is given up on through this, and
  // tried again on a fresh connection (twice at most, then the operator
  // decides).
  const giveUpOnStall = useRef<(() => void) | null>(null);
  const recoveries = useRef(0);
  const restartAfter = useRef(false);
  const hasReceivedPreviewFrameRef = useRef(false);

  const configuredForIris = activeDevice?.connectionType === "wifi";
  const omittedEyes = useMemo(
    () => getOmittedEyes(persistedIrises),
    [persistedIrises],
  );
  const bothEyesOmitted = omittedEyes.left && omittedEyes.right;

  useEffect(() => {
    hasReceivedPreviewFrameRef.current = hasReceivedPreviewFrame;
  }, [hasReceivedPreviewFrame]);

  const buildIrisPayload = useCallback(
    (
      modelNumber: string,
      serialNumber: string,
      result: IrisCaptureResult,
      omitted: Record<IrisEyePosition, boolean>,
    ) =>
      requiredEyes.map((eyePosition) => {
        if (omitted[eyePosition]) {
          return mapIris({
            eyePosition,
            make: "IdentiFI",
            modelNumber,
            serialNumber,
            missingReason,
          });
        }

        const isLeft = eyePosition === "left";
        return mapIris({
          eyePosition,
          image: isLeft ? result.leftImage : result.rightImage,
          imageHeight: result.imageHeight ?? 480,
          imageWidth: result.imageWidth ?? 640,
          totalScore: isLeft ? result.leftTotalScore : result.rightTotalScore,
          usableArea: isLeft ? result.leftUsableArea : result.rightUsableArea,
          horizontalPixelDensity: result.horizontalPixelDensity ?? 0,
          verticalPixelDensity: result.verticalPixelDensity ?? 0,
          imageBitsPerPixelQuantity: result.imageBitsPerPixelQuantity ?? 8,
          make: "IdentiFI",
          modelNumber,
          serialNumber,
        });
      }),
    [],
  );

  const finalizeCapture = useCallback(
    async (result: IrisCaptureResult) => {
      let modelNumber = activeDevice?.modelNumber ?? "UNKNOWN";
      let serialNumber = activeDevice?.serialNumber ?? "UNKNOWN";

      try {
        const deviceInfo = await ExpoIdentifiModule.getDeviceInfo();
        modelNumber = deviceInfo.modelNumber || modelNumber;
        serialNumber = deviceInfo.serialNumber || serialNumber;
      } catch (error) {
        console.warn("Falling back to placeholder iris device metadata", error);
      }

      const current = getValue<Iris[]>("transaction.irises");
      const captured = buildIrisPayload(
        modelNumber,
        serialNumber,
        result,
        getOmittedEyes(current),
      ).filter((iris) => !eye || iris.eyePosition === eye);

      setLoadingMessage("");
      setCaptureRunning(false);
      logEvent(
        "iris",
        `captured: ${captured
          .map(
            (iris) =>
              `${iris.eyePosition} ${iris.image ? `score ${iris.totalScore ?? "?"}` : "omitted"}`,
          )
          .join(", ")}`,
      );
      // On to the review: Save Image keeps them, Recapture runs it again.
      if (mounted.current) setReview(captured);
    },
    [
      activeDevice?.modelNumber,
      activeDevice?.serialNumber,
      buildIrisPayload,
      eye,
      getValue,
    ],
  );

  const saveReview = useCallback(() => {
    if (!review) return;
    setValue(
      "transaction.irises",
      upsertIrises(getValue<Iris[]>("transaction.irises"), review),
    );
    logEvent("iris", "saved at review");
    router.back();
  }, [getValue, review, router, setValue]);

  const handleIrisCaptureStatus = useCallback(
    ({ irisCaptureStatus }: IrisCaptureStatusEvent) => {
      logEvent("iris", `scanner status ${irisCaptureStatus}`);
      switch (irisCaptureStatus) {
        // The Android app's status lines (SICManager.onIrisCaptureStatus).
        case 1:
          setLoadingMessage("");
          setHasReceivedPreviewFrame(true);
          // The camera is live from here: say what the subject should do.
          setCaptureStatusDescription(tHelper("irisLookIntoScanner"));
          break;
        case 2:
          setLoadingMessage("");
          setHasReceivedPreviewFrame(true);
          setCaptureStatusDescription(tHelper("irisEyesDetected"));
          // Some scanners (45I) keep previewing for a few seconds and then
          // report the capture complete (status 3); others (50i) stop here
          // and never report it. Either way the images are on their way a
          // few seconds from now.
          if (retrievingTimer.current) clearTimeout(retrievingTimer.current);
          retrievingTimer.current = setTimeout(() => {
            setCaptureStatusDescription(tHelper("irisRetrievingImages"));
            setTakingImages(true);
          }, 3000);
          // The preview stops here while the scanner takes its images, which
          // is normal: allow that phase longer before calling it a stall.
          irisFrames.at = Date.now() + 15000;
          break;
        case 3:
          if (retrievingTimer.current) clearTimeout(retrievingTimer.current);
          setCaptureStatusDescription(tHelper("irisRetrievingImages"));
          setTakingImages(true);
          break;
        case 5:
          setLoadingMessage("");
          setCaptureStatusDescription(tHelper("irisPoweringOn"));
          break;
        default:
          break;
      }
    },
    [],
  );

  useEffect(() => {
    const subscription = ExpoIdentifiModule.addIrisCaptureStatusListener(
      handleIrisCaptureStatus,
    );

    return () => {
      subscription.remove();
    };
  }, [handleIrisCaptureStatus]);

  useEffect(() => {
    const subscription = ExpoIdentifiModule.addIrisPreviewFrameListener(() => {
      logEvent("iris", "first preview frame");
      irisFrames.at = Date.now();
      setHasReceivedPreviewFrame(true);
      setLoadingMessage("");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleUnsupportedModel = useCallback(
    (modelNumber: string) => {
      setUnsupportedModel(modelNumber);
      Alert.alert(tHelper("captureIris"), tHelper("irisUnsupportedDevice"), [
        {
          text: tHelper("close"),
          style: "cancel",
          onPress: () => router.back(),
        },
      ]);
    },
    [router],
  );

  const startCapture = useCallback(async () => {
    const currentOmissions = getOmittedEyes(
      getValue<Iris[]>("transaction.irises"),
    );
    if (
      captureRunningRef.current ||
      !configuredForIris ||
      (currentOmissions.left && currentOmissions.right)
    ) {
      logEvent(
        "iris",
        `start skipped: ${captureRunningRef.current ? "already running" : !configuredForIris ? "no iris scanner in use" : "both eyes omitted"}`,
      );
      return;
    }

    // Marked straight away, not on the next render: a second start arriving
    // in the same moment must see it, or the scanner is started twice.
    captureRunningRef.current = true;
    abandoned.current = false;
    const startedAt = Date.now();
    logEvent("iris", `capture starting${eye ? ` (${eye} eye)` : ""}`);
    setCaptureRunning(true);
    setHasReceivedPreviewFrame(false);
    setTakingImages(false);
    if (retrievingTimer.current) clearTimeout(retrievingTimer.current);
    setReview(null);
    setLoadingMessage("");
    setCaptureStatusDescription(
      tHelper(recoveries.current ? "irisReconnecting" : "connectingToDevice"),
    );
    setUnsupportedModel(undefined);
    closeConnectionFailedDialog();

    startingUp.current = true;
    try {
      const connected = await connectToDevice();
      if (!connected || !mounted.current) {
        if (!connected) irisTrouble.seen = true;
        logEvent("iris", connected ? "left before the capture began" : "could not connect");
        return;
      }
      logEvent("iris", `connected after ${Date.now() - startedAt} ms`);

      // A warm-up still powering the camera on finishes first.
      if (ExpoIdentifiModule.isConnected()) {
        setCaptureStatusDescription(tHelper("irisPoweringOn"));
      }
      await ExpoIdentifiModule.settleWarmUp();
      const { modelNumber } = await ExpoIdentifiModule.getDeviceInfo();
      if (!supportsIrisCapture(modelNumber)) {
        handleUnsupportedModel(modelNumber);
        return;
      }

      if (recoveries.current) {
        // Trying again after a stall: the scanner may still be in the
        // capture it stopped answering about. Stop that first.
        await ExpoIdentifi.cancelIrisCapture().catch(() => undefined);
      }
      // The status line says what the scanner is doing, as on Android.
      setCaptureStatusDescription(tHelper("irisPoweringOn"));
      // Powering the iris camera on is slow. If the operator cancelled or
      // left while it was warming up, the capture must not be started: with
      // nobody watching, the scanner would sit there capturing on its own.
      await ExpoIdentifi.ensureIrisPowerOn();
      if (!mounted.current || abandoned.current) {
        logEvent("iris", "cancelled while powering on; capture not started");
        return;
      }
      startingUp.current = false;
      irisFrames.at = 0;
      const capture = ExpoIdentifi.startIrisCapture();
      capture.catch(() => undefined);
      // Whichever comes first: the irises, or giving up on a stalled capture.
      const stalled = new Promise<never>((_, reject) => {
        giveUpOnStall.current = () => reject(new IrisStalledError());
      });
      const result = await Promise.race([capture, stalled]);
      recoveries.current = 0;
      irisTrouble.seen = false;
      logEvent("iris", `result received after ${Date.now() - startedAt} ms`);
      if (!mounted.current) {
        return;
      }

      await finalizeCapture(result);
    } catch (error) {
      if (!mounted.current) {
        return;
      }

      if (!abandoned.current) irisTrouble.seen = true;
      logEvent("iris", "capture did not complete", error);
      console.warn("Error capturing irises", error);
      if (error instanceof IrisStalledError) {
        // Drop the dead link. The first two times, connect again and carry
        // on by itself; after that it is the operator's call.
        await ExpoIdentifi.disconnect().catch(() => undefined);
        recoveries.current += 1;
        if (recoveries.current <= 2 && !abandoned.current) {
          logEvent("iris", `recovering from a stall (attempt ${recoveries.current})`);
          restartAfter.current = true;
          return;
        }
        recoveries.current = 0;
        Alert.alert(tHelper("error"), tHelper("irisStalled"), [
          {
            text: tHelper("retry"),
            onPress: () => void startCapture(),
          },
          {
            text: tHelper("irisReset"),
            onPress: async () => {
              setCaptureStatusDescription(tHelper("deviceResetting"));
              await ExpoIdentifi.resetSensors().catch(() => false);
              void startCapture();
            },
          },
          {
            text: tHelper("close"),
            style: "cancel",
            onPress: () => router.back(),
          },
        ]);
        return;
      }
      const isCancelled =
        error instanceof Error &&
        error.message.toLowerCase().includes("cancel");

      if (isCancelled && suppressCancelAlert.current) {
        suppressCancelAlert.current = false;
        return;
      }

      Alert.alert(
        tHelper("error"),
        isCancelled
          ? tHelper("captureCancelled")
          : tHelper("failedToCaptureIris"),
        [
          {
            text: tHelper("retry"),
            onPress: () => {
              attemptedAutoStart.current = true;
              void startCapture();
            },
          },
          {
            text: tHelper("close"),
            style: "cancel",
            onPress: () => {
              router.back();
            },
          },
        ],
      );
    } finally {
      giveUpOnStall.current = null;
      startingUp.current = false;
      captureRunningRef.current = false;
      if (restartAfter.current) {
        restartAfter.current = false;
        if (mounted.current && !abandoned.current) {
          setTimeout(() => void startCaptureRef.current(), 500);
        }
      }
      if (mounted.current) {
        setCaptureRunning(false);
        setLoadingMessage("");
        if (!hasReceivedPreviewFrameRef.current) {
          setCaptureStatusDescription(tHelper("irisPoweringOn"));
        }
      }
    }
  }, [
    closeConnectionFailedDialog,
    configuredForIris,
    connectToDevice,
    finalizeCapture,
    getValue,
    handleUnsupportedModel,
    router,
  ]);

  // What the focus effect below needs, read through refs so the effect runs
  // once per visit. If it depended on these directly, any refresh of the
  // device entry would run its clean-up (cancel, power off, disconnect) and
  // then start the capture all over again.
  const startCaptureRef = useRef(startCapture);
  startCaptureRef.current = startCapture;
  const canStartRef = useRef(false);
  canStartRef.current = configuredForIris && !bothEyesOmitted;
  const disconnectRef = useRef(disconnectFromDevice);
  disconnectRef.current = disconnectFromDevice;

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      attemptedAutoStart.current = false;
      logEvent("iris", "capture screen opened");

      if (canStartRef.current) {
        attemptedAutoStart.current = true;
        void startCaptureRef.current();
      }

      const endCapture = async () => {
        abandoned.current = true;
        // A start-up still in flight (connecting, powering on) must finish
        // first, or its commands would land after these and undo them.
        for (let i = 0; i < 80 && startingUp.current; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        // Stop a capture that is still running. The iris camera stays on and
        // the connection stays open for a recapture; both are released when
        // the collection ends.
        if (captureRunningRef.current) {
          await ExpoIdentifi.cancelIrisCapture().catch(() => undefined);
        }
        logEvent("iris", "clean-up finished");
      };

      return () => {
        logEvent("iris", "capture screen closed");
        mounted.current = false;
        void endCapture();
        setHasReceivedPreviewFrame(false);
        setTakingImages(false);
        if (retrievingTimer.current) clearTimeout(retrievingTimer.current);
        setLoadingMessage("");
        setCaptureStatusDescription(tHelper("irisPoweringOn"));
        setCaptureRunning(false);
      };
    }, []),
  );

  // The preview runs for the whole capture. If it stops and stays stopped,
  // the link to the scanner has gone quiet (its own lights may stay on).
  useEffect(() => {
    if (!captureRunning || !hasReceivedPreviewFrame) return;
    const timer = setInterval(() => {
      if (irisFrames.at && Date.now() - irisFrames.at > 10000) {
        logEvent("iris", "no preview for 10 s; giving up on this capture");
        irisFrames.at = 0;
        giveUpOnStall.current?.();
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [captureRunning, hasReceivedPreviewFrame]);

  /** Cancel: stop the capture quietly and go back to the iris screen. */
  const handleCancel = useCallback(() => {
    logEvent("iris", "cancel pressed");
    abandoned.current = true;
    suppressCancelAlert.current = true;
    // Leaving runs the screen's clean-up: cancel the capture, power the iris
    // camera off, disconnect.
    router.back();
  }, [router]);

  const wheelColor = useThemeColor({}, "textStrong");
  // Right eye on the left, as the subject faces the scanner and as on Android.
  const eyes: IrisEyePosition[] = ["right", "left"];
  const eyeName = (position: IrisEyePosition) =>
    tHelper(position === "left" ? "leftEye" : "rightEye");

  return (
    <>
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        {review ? (
          // The Android app's iris review: Recapture at the top, each eye with
          // its quality score above it, Save Image at the bottom.
          <View style={styles.container}>
            <Button
              icon="camera-retake-outline"
              text={tHelper("recapture")}
              style={styles.wideButton}
              onPress={() => {
                attemptedAutoStart.current = true;
                void startCapture();
              }}
            />
            <View style={styles.reviewBody}>
              {eyes
                .map((position) =>
                  review.find((iris) => iris.eyePosition === position),
                )
                .filter((iris): iris is Iris => !!iris?.image)
                .map((iris) => (
                  <View key={iris.eyePosition} style={styles.reviewEye}>
                    <Text style={styles.reviewScore}>
                      {eyeName(iris.eyePosition)}
                      {iris.totalScore != null
                        ? ` ${tHelper("qualityScore")}${iris.totalScore}`
                        : ""}
                    </Text>
                    <Image
                      resizeMode="contain"
                      style={styles.reviewImage}
                      source={{ uri: `data:image/png;base64,${iris.image}` }}
                    />
                  </View>
                ))}
            </View>
            <Button
              icon="content-save-outline"
              text={tHelper("saveImage")}
              style={styles.wideButton}
              onPress={saveReview}
            />
          </View>
        ) : (
          // The Android app's capture view: what is being captured, the
          // scanner's status, the two live eye previews, Cancel.
          <View style={styles.capture}>
            {!!eye && (
              <Text style={styles.captureText}>
                {tHelper(eye === "left" ? "captureLeftIris" : "captureRightIris")}
              </Text>
            )}
            <Text style={styles.captureText}>{captureStatusDescription}</Text>
            {/* Above the previews: until they are live, and again while the
                scanner takes and sends its images. */}
            <View style={styles.wheelSlot}>
              {(connecting ||
                (captureRunning &&
                  (!hasReceivedPreviewFrame || takingImages))) && (
                <ActivityIndicator size="large" color={wheelColor} />
              )}
            </View>
            {!!unsupportedModel && (
              <Text style={styles.warning}>
                {tHelper("irisUnsupportedDevice")}: {unsupportedModel}
              </Text>
            )}
            <View style={styles.previews}>
              {eyes.map((position) => (
                <ExpoIdentifiView
                  key={position}
                  streamType={position === "left" ? "irisLeft" : "irisRight"}
                  style={styles.eyePreview}
                  onLayout={(e) =>
                    logEvent(
                      "iris",
                      `${position} preview box ${Math.round(e.nativeEvent.layout.width)}x${Math.round(e.nativeEvent.layout.height)}`,
                    )
                  }
                />
              ))}
            </View>
            <Button
              text={tHelper("cancel")}
              variant="secondary"
              style={styles.cancelButton}
              onPress={handleCancel}
            />
          </View>
        )}
      </SafeAreaView>
      <ConnectionFailedDialog
        visible={connectionFailed}
        onRetry={() => {
          attemptedAutoStart.current = true;
          void startCapture();
        }}
        onClose={closeConnectionFailedDialog}
        deviceType={activeDevice?.connectionType}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  // Everything in a column in the middle of the screen, as on Android.
  capture: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 5,
  },
  captureText: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  previews: { flexDirection: "row", alignSelf: "stretch", gap: 4 },
  eyePreview: {
    flex: 1,
    height: 190,
    backgroundColor: "#000000",
    borderRadius: 4,
    overflow: "hidden",
  },
  cancelButton: { width: 150, marginTop: 8 },
  // Keeps its height whether or not the wheel shows, so nothing jumps.
  wheelSlot: { height: 40, justifyContent: "center" },
  wideButton: { alignSelf: "center", minWidth: 240 },
  reviewBody: { flex: 1, justifyContent: "center", gap: 10 },
  reviewEye: { alignItems: "center", gap: 4, flexShrink: 1 },
  reviewScore: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  reviewImage: { width: "100%", aspectRatio: 4 / 3, maxHeight: 320 },
  warning: {
    color: "#b42318",
    fontWeight: 600,
  },
});
