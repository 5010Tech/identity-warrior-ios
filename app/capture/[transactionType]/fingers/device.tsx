import { Spinner } from "@/components/Spinner";
import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { Button } from "@/components/Button";
import { FormButtons } from "@/components/form";
import { H2, SafeAreaView, Text, useThemeColor } from "@/components/themed";
import { OmitFingerDialog } from "@/features/capture/OmitFingerDialog";
import { OmitFingerPicker } from "@/features/capture/OmitFingerPicker";
import { useCaptureActions } from "@/features/capture/context/hooks";
import { useActiveDevice } from "@/components/device/activeDevice";
import { mapFinger } from "@/features/capture/context/util";
import { fingerGuideImage } from "@/features/capture/fingerGuideImages";
import {
  finishDeviceCapture,
  isDeviceCaptureAwaited,
} from "@/features/capture/deviceCapture";
import {
  CaptureSequence,
  CaptureState,
  SlapImage,
} from "@/features/capture/types";
import {
  captureSequence,
  fgpFromMultiple,
  leftHandFirst,
  sequenceForSegmentation,
} from "@/features/capture/util";
import { ExpoIdentifiView } from "@/modules/expo-identifi";
import ExpoIdentifiModule from "@/modules/expo-identifi/src/ExpoIdentifiModule";
import { tHelper } from "@/translations/translationHelper";
import { logEvent } from "@/util/fieldLog";
import { TimeoutError } from "@/util/withTimeout";
import {
  AmputatedOrBandaged,
  Base64Image,
  FGP,
  Finger,
  NFIQScore,
} from "@/types/BiometricData";
import { mapToFingerType } from "@/types/util";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";

/**
 * What to capture after some fingers of a capture have been omitted: the
 * fingers that are left, two at a time where both of a pair remain and one at
 * a time otherwise (the scanner captures one, two or four fingers, nothing in
 * between), then the omitted ones, which are recorded as missing.
 */
const regroup = (code: CaptureSequence, omittedNow: FGP[]): CaptureSequence[] => {
  const pairs: [FGP, FGP, CaptureSequence][] = [
    [FGP.RIGHT_INDEX, FGP.RIGHT_MIDDLE, captureSequence.RIGHT_INDEX_AND_MIDDLE],
    [FGP.RIGHT_RING, FGP.RIGHT_LITTLE, captureSequence.RIGHT_RING_AND_LITTLE],
    [FGP.LEFT_INDEX, FGP.LEFT_MIDDLE, captureSequence.LEFT_INDEX_AND_MIDDLE],
    [FGP.LEFT_RING, FGP.LEFT_LITTLE, captureSequence.LEFT_RING_AND_LITTLE],
  ];
  const members: FGP[] = fgpFromMultiple[code];
  const left = members.filter((finger) => !omittedNow.includes(finger));
  const next: CaptureSequence[] = [];
  const paired = new Set<FGP>();
  if (members.length === 4) {
    pairs.forEach(([a, b, pair]) => {
      if (left.includes(a) && left.includes(b)) {
        next.push(pair);
        paired.add(a).add(b);
      }
    });
  }
  left.filter((finger) => !paired.has(finger)).forEach((f) => next.push(f));
  return [...next, ...omittedNow];
};

/** The preview stopped but the captured image never arrived. */
class ScannerHungError extends Error {
  constructor() {
    super("The scanner did not send the image");
    this.name = "ScannerHungError";
  }
}

/** The scanner segmented fewer fingers than the capture asked for. */
class MissingSegmentError extends Error {
  constructor(
    readonly found: number,
    readonly expected: number,
  ) {
    super(`Scanner found ${found} of ${expected} fingers`);
    this.name = "MissingSegmentError";
  }
}

export default function DeviceCaptureScreen() {
  const {
    fgp: rawFgp,
    steps: rawSteps,
    rolled: rawRolled,
    slap: rawSlap,
  } = useLocalSearchParams();
  // MAP and CAR: a four-finger slap is also kept whole, as one image.
  const keepSlap = rawSlap === "1";
  // MAP and CAR: this visit rolls one finger (impression type 1) instead of
  // taking it flat.
  const rolled = rawRolled === "1";
  // DoD capture steps (getDodFingerPlan), as a comma-separated list of positions.
  const stepsKey = typeof rawSteps === "string" ? rawSteps : "";
  const fgp: FGP | undefined =
    rawFgp && !isNaN(Number(rawFgp)) ? Number(rawFgp) : undefined;
  const [capturingAt, setCapturingAt] = useState<CaptureSequence>(0);
  const cancelled = useRef(false);
  const captureInFlight = useRef(false);
  // True only while the scanner is in a capture: the only time a cancel
  // means anything to it.
  const scanning = useRef(false);
  const leaving = useRef(false);
  // DoD: Omit stops the capture and opens the picker; the capture loop waits
  // here for the operator's choice, then starts again for what is left.
  const pickRequested = useRef(false);
  // Ends the wait for a capture whose image never arrives.
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const giveUp = useRef<(() => void) | null>(null);
  // How long to wait for the image once the preview has stopped. A four-finger
  // image is several times the size of a single print and has taken 20 s and
  // more to come over, so the wait goes by how many fingers are on the platen.
  const giveUpAfter = useRef(45000);
  const previewStoppedAt = useRef(0);
  // Times a capture was started again by itself after the link dropped.
  const linkRetries = useRef(0);
  const [lowQuality, setLowQuality] = useState(false);
  const [rollAgain, setRollAgain] = useState(false);
  const [picker, setPicker] = useState<{
    fingers: FGP[];
    done: (omittedNow: FGP[]) => void;
  } | null>(null);
  const { setValue, getValue } = useCaptureActions();
  const { getValue: getAutofillValue } = useAutofill();
  const { activeDevice } = useActiveDevice();
  // Read through a ref: the capture in hand must not be torn down and
  // restarted because the device entry was refreshed.
  const deviceRef = useRef(activeDevice);
  if (activeDevice) deviceRef.current = activeDevice;
  // DoD: the connection is kept for the whole fingerprint screen, so the next
  // capture does not have to connect again. Set when a capture starts.
  const keepConnection = useRef(false);
  const router = useRouter();
  const omitted = useRef<AmputatedOrBandaged[]>([]);
  const [spinnerMessage, setSpinnerMessage] = useState<string>("");
  const [omittedFingerDialogVisible, setOmittedFingerDialogVisible] =
    useState(false);

  // The moment the scanner stops previewing it has its image; show the wait
  // right then, not when the image has finished coming over.
  useEffect(() => {
    const subscription = ExpoIdentifiModule.addFpCaptureProgressListener(
      ({ state, status }) => {
        if (cancelled.current || pickRequested.current) return;
        if (state === "status") {
          logEvent("scanner", `scanner reported status ${status}`);
          // 1: the print was below the minimum quality; the scanner waits
          // for a better placement.
          if (status === 1) setLowQuality(true);
          // Any other notice during a roll: it was not accepted (smeared,
          // say) and the scanner waits for the finger to be rolled again.
          else if (rolled) setRollAgain(true);
          return;
        }
        if (stallTimer.current) clearTimeout(stallTimer.current);
        stallTimer.current = null;
        if (state === "stalled") {
          // The preview has stopped, so the image should follow. If nothing
          // comes, the scanner has hung: give up on this capture rather than
          // wait for ever.
          previewStoppedAt.current = Date.now();
          const wait = giveUpAfter.current;
          const deadline = Date.now() + wait;
          const tick = () => {
            if (Date.now() >= deadline) {
              logEvent(
                "scanner",
                `no image ${wait / 1000} s after the preview stopped`,
              );
              giveUp.current?.();
              return;
            }
            // The scanner sometimes drops the link while the image is on its
            // way. There is nothing left to wait for then, so stop at once
            // and let the retake below reconnect.
            if (!ExpoIdentifiModule.isConnected()) {
              logEvent(
                "scanner",
                "the link went while waiting for the image",
              );
              giveUp.current?.();
              return;
            }
            stallTimer.current = setTimeout(tick, 2000);
          };
          stallTimer.current = setTimeout(tick, 2000);
        }
        if (state !== "stalled") setLowQuality(false);
        setSpinnerMessage(state === "streaming" ? "" : tHelper("processing"));
      },
    );
    return () => {
      subscription.remove();
      if (stallTimer.current) clearTimeout(stallTimer.current);
    };
  }, []);

  const doCapture = useCallback(async () => {
    if (captureInFlight.current) {
      return;
    }

    captureInFlight.current = true;
    const getOmitted = (fgp: CaptureSequence) =>
      omitted.current.find(({ fingerPosition }) => fingerPosition === fgp);
    setSpinnerMessage("Preparing for capture...");
    try {
      const startedAt = Date.now();
      keepConnection.current = isDeviceCaptureAwaited();
      // Let a warm-up still under way finish before talking to the scanner.
      await ExpoIdentifiModule.settleWarmUp();
      // Normally connected already; this covers a retry after a failure.
      if (!ExpoIdentifiModule.isConnected()) await ExpoIdentifiModule.connect();
      logEvent("scanner", `capture screen: ${fgp ? `finger ${fgp}` : stepsKey ? `steps ${stepsKey}` : "full sequence"}`);
      await ExpoIdentifiModule.clearMemoryBuffer().catch(() =>
        logEvent("scanner", "clearing saved images did not answer"),
      );
      // DoD, as on Android: no minimum quality on the scanner. A print below
      // the minimum makes the scanner hold out for a better one, which looks
      // like a hang; the operator judges quality at the review instead.
      await ExpoIdentifiModule.setMinimumNFIQScore(
        isDeviceCaptureAwaited() ? 5 : 3,
      );

      let pngFingers: CaptureState["pngFingers"] = getValue("pngFingers");
      let fingers: Finger[] = getValue("transaction.fingers");
      // What this visit captures, for the review on the fingerprint screen.
      const captured: Finger[] = [];
      const capturedPngs: Record<string, string> = {};
      const capturedSlaps: Partial<Record<number, SlapImage>> = {};
      // The scanner's model and serial number are known from when it was
      // detected or added; asking it again costs two round trips per capture.
      const { modelNumber, serialNumber } =
        deviceRef.current?.modelNumber && deviceRef.current?.serialNumber
          ? {
              modelNumber: deviceRef.current.modelNumber,
              serialNumber: deviceRef.current.serialNumber,
            }
          : await ExpoIdentifiModule.getDeviceInfo();

      const modelNumberValue = parseInt(modelNumber.match(/\d+/)?.[0] ?? "0");
      const steps = stepsKey
        .split(",")
        .map(Number)
        .filter((step) => step in fgpFromMultiple) as FGP[];
      // DoD steps are always flat impressions, whatever the DHS sequence says.
      const fingerprintCaptureSequence = rolled
        ? "tenRolled"
        : steps.length
          ? "tenFlat"
          : getAutofillValue("appSettings")?.fingerprintCaptureSequence;
      let sequence: CaptureSequence[] = [];
      if (fgp) {
        sequence = [fgp];
      } else if (steps.length) {
        // Split each step down to what this scanner's platen can take.
        const pairs: Partial<Record<FGP, CaptureSequence[]>> = {
          [FGP.PLAIN_LEFT_FOUR_FINGERS]: [
            captureSequence.LEFT_INDEX_AND_MIDDLE,
            captureSequence.LEFT_RING_AND_LITTLE,
          ],
          [FGP.PLAIN_RIGHT_FOUR_FINGERS]: [
            captureSequence.RIGHT_INDEX_AND_MIDDLE,
            captureSequence.RIGHT_RING_AND_LITTLE,
          ],
        };
        sequence = steps.flatMap<CaptureSequence>((step) =>
          modelNumberValue < 45
            ? fgpFromMultiple[step]
            : modelNumberValue < 50
              ? (pairs[step] ?? [step])
              : [step],
        );
      } else if (fingerprintCaptureSequence === "twoFlat") {
        sequence = [FGP.RIGHT_INDEX, FGP.LEFT_INDEX];
      } else if (
        modelNumberValue < 45 ||
        fingerprintCaptureSequence === "tenRolled"
      ) {
        sequence = [
          FGP.RIGHT_INDEX,
          FGP.RIGHT_MIDDLE,
          FGP.RIGHT_RING,
          FGP.RIGHT_LITTLE,
          FGP.LEFT_INDEX,
          FGP.LEFT_MIDDLE,
          FGP.LEFT_RING,
          FGP.LEFT_LITTLE,
          FGP.RIGHT_THUMB,
          FGP.LEFT_THUMB,
        ];
      } else if (modelNumberValue < 50) {
        sequence = [
          captureSequence.RIGHT_INDEX_AND_MIDDLE,
          captureSequence.RIGHT_RING_AND_LITTLE,
          captureSequence.LEFT_INDEX_AND_MIDDLE,
          captureSequence.LEFT_RING_AND_LITTLE,
          captureSequence.PLAIN_LEFT_AND_RIGHT_THUMBS,
        ];
      } else {
        sequence = [
          FGP.PLAIN_RIGHT_FOUR_FINGERS,
          FGP.PLAIN_LEFT_FOUR_FINGERS,
          FGP.PLAIN_LEFT_AND_RIGHT_THUMBS,
        ];
      }
      if (
        !fgp &&
        !steps.length &&
        getAutofillValue("appSettings")?.startingHand === "Left"
      ) {
        sequence = leftHandFirst(sequence);
      }
      captures: for (const [i, currentFGP] of sequence.entries()) {
        setSpinnerMessage("");
        if (cancelled.current) {
          return;
        }
        setCapturingAt(currentFGP);
        if ((steps.length || isDeviceCaptureAwaited()) && !getOmitted(currentFGP)) {
          // As on Android, before every capture: make sure the fingerprint
          // sensor is powered and clear the scanner's saved images.
          setSpinnerMessage("Preparing for capture...");
          const power = await ExpoIdentifiModule.ensureFpPowerOn();
          if (i > 0) {
            await ExpoIdentifiModule.clearMemoryBuffer().catch(() =>
              logEvent("scanner", "clearing saved images did not answer"),
            );
          }
          logEvent("scanner", `ready for ${currentFGP}: sensor power ${power}`);
          setSpinnerMessage("");
          if (cancelled.current) return;
        }
        if (!getOmitted(currentFGP)) {
          try {
            logEvent(
              "scanner",
              `capture ${currentFGP} started (${fgpFromMultiple[currentFGP].length} finger)`,
            );
            scanning.current = true;
            setLowQuality(false);
            previewStoppedAt.current = 0;
            setRollAgain(false);
            giveUpAfter.current =
              { 1: 20000, 2: 25000, 4: 90000 }[
                fgpFromMultiple[currentFGP].length as 1 | 2 | 4
              ] ?? 45000;
            try {
              const capture = ExpoIdentifiModule.captureFingerprints(
                fgpFromMultiple[currentFGP].length,
                0,
                fingerprintCaptureSequence,
              );
              // Whichever comes first: the capture, or giving up on it.
              const hung = new Promise<never>((_, reject) => {
                giveUp.current = () =>
                  reject(new ScannerHungError());
              });
              capture.catch(() => undefined);
              await Promise.race([capture, hung]);
            } finally {
              scanning.current = false;
              giveUp.current = null;
              if (stallTimer.current) clearTimeout(stallTimer.current);
              stallTimer.current = null;
            }
            logEvent(
              "scanner",
              `capture ${currentFGP} image received${
                previewStoppedAt.current
                  ? ` ${Date.now() - previewStoppedAt.current} ms after the preview stopped`
                  : ""
              }`,
            );
          } catch (e) {
            logEvent("scanner", `capture ${currentFGP} did not complete`, e);
            if (cancelled.current) return;
            if (e instanceof ScannerHungError) {
              // Nothing more to try on this connection: stop, and let the
              // operator retry (which reconnects) or cancel.
              await ExpoIdentifiModule.stopCapture();
              // Sending that stop is what shows a link that had silently
              // dropped (the scanner itself is fine). Then the fix is simply
              // to connect again and take this capture again, without
              // troubling the operator; twice at most.
              if (!ExpoIdentifiModule.isConnected() && linkRetries.current < 2) {
                linkRetries.current += 1;
                logEvent(
                  "scanner",
                  `link to the scanner was lost; reconnecting (try ${linkRetries.current})`,
                );
                setSpinnerMessage(tHelper("connectingToDevice"));
                await ExpoIdentifiModule.connect();
                await ExpoIdentifiModule.setMinimumNFIQScore(
                  isDeviceCaptureAwaited() ? 5 : 3,
                );
                if (cancelled.current) return;
                sequence.splice(i + 1, 0, currentFGP);
                continue;
              }
              throw e;
            }
            if (pickRequested.current) {
              // Stopped for Omit: the operator picks the fingers to leave
              // out, then the capture starts again for the rest (or, with
              // none picked, as it was).
              setSpinnerMessage("");
              const members = [...sequenceForSegmentation(currentFGP)] as FGP[];
              const omittedNow = await new Promise<FGP[]>((done) =>
                setPicker({ fingers: members, done }),
              );
              setPicker(null);
              pickRequested.current = false;
              if (cancelled.current) return;
              logEvent(
                "scanner",
                `omit: ${omittedNow.length} of ${members.length} finger(s) left out of ${currentFGP}`,
              );
              // The reason is a stand-in; the review asks for it per print.
              omittedNow.forEach((fingerPosition) =>
                omitted.current.push({ reason: "UP", fingerPosition }),
              );
              sequence.splice(
                i + 1,
                0,
                ...(omittedNow.length
                  ? regroup(currentFGP, omittedNow)
                  : [currentFGP]),
              );
              continue;
            }
            if (fgpFromMultiple[currentFGP].length > 1) {
              await ExpoIdentifiModule.clearMemoryBuffer().catch((error) => {
                console.error(
                  "Error clearing memory buffer after retry split",
                  error,
                );
              });
              sequence.splice(i + 1, 0, ...fgpFromMultiple[currentFGP]);
              continue;
            }
            if (
              e instanceof Error &&
              e.message.includes("cancelled") &&
              cancelled.current
            ) {
              console.warn("Capture cancelled by user");
              return;
            }
            if (!fgpFromMultiple[currentFGP].some((fgp) => getOmitted(fgp))) {
              throw e;
            }
          }
        }
        if (cancelled.current) {
          return;
        }
        setSpinnerMessage(`${tHelper("processing")}`);
        const readingFrom = Date.now();
        const spent = { image: 0 };
        for (const [j, fgp] of sequenceForSegmentation(currentFGP).entries()) {
          const fingerType = mapToFingerType(fgp);

          let nfiq: NFIQScore | undefined;
          let imageHeight: number | undefined;
          let imageWidth: number | undefined;
          let wsqImage: Base64Image | undefined;
          if (!getOmitted(fgp)) {
            try {
              const mark = Date.now();
              // Image from the scanner; WSQ and quality score on the phone.
              const print = await ExpoIdentifiModule.getPrint(j);
              spent.image += Date.now() - mark;
              if (!print) {
                // The scanner found fewer fingers than this capture needs.
                throw new MissingSegmentError(
                  j,
                  sequenceForSegmentation(currentFGP).length,
                );
              }
              pngFingers = { ...pngFingers, [fingerType]: print.png };
              capturedPngs[fingerType] = print.png;
              nfiq = print.nfiq;
              imageHeight = print.height;
              imageWidth = print.width;
              wsqImage = print.wsq;
            } catch (error) {
              // The scanner stopped answering part-way through reading the
              // prints: the same trouble as a capture that never arrives, so
              // it reconnects and takes this capture again.
              if (error instanceof TimeoutError) {
                logEvent(
                  "scanner",
                  `the scanner stopped answering while reading print ${j} of ${currentFGP}`,
                );
                await ExpoIdentifiModule.clearMemoryBuffer().catch(
                  () => undefined,
                );
                if (
                  !ExpoIdentifiModule.isConnected() &&
                  linkRetries.current < 2
                ) {
                  linkRetries.current += 1;
                  logEvent(
                    "scanner",
                    `link to the scanner was lost; reconnecting (try ${linkRetries.current})`,
                  );
                  setSpinnerMessage(tHelper("connectingToDevice"));
                  await ExpoIdentifiModule.connect();
                  await ExpoIdentifiModule.setMinimumNFIQScore(
                    isDeviceCaptureAwaited() ? 5 : 3,
                  );
                  if (cancelled.current) return;
                  // This capture gave no usable prints: take it again.
                  sequence.splice(i + 1, 0, currentFGP);
                  continue captures;
                }
                throw new ScannerHungError();
              }
              if (!(error instanceof MissingSegmentError)) {
                console.error(
                  `Error retrieving fingerprint segment ${j} for ${fgp}`,
                  error,
                );
              }
              await ExpoIdentifiModule.clearMemoryBuffer().catch(
                (clearError) => {
                  console.error(
                    "Error clearing memory buffer after segment failure",
                    clearError,
                  );
                },
              );
              throw error;
            }
          }

          const finger: Finger = mapFinger({
            i,
            fgp,
            imageHeight,
            imageWidth,
            image: wsqImage,
            make: "IdentiFI",
            modelNumber,
            serialNumber,
            nfiq,
            missingFingerprintsReason: getOmitted(currentFGP)?.reason,
            fingerprintCaptureSequence,
          });

          captured.push(finger);
          omitted.current = omitted.current.filter(
            ({ fingerPosition }) => fingerPosition !== fgp,
          );

          const fingerIndex = fingers.findIndex(
            (f) => f.fingerPosition === fgp,
          );

          if (fingerIndex === -1) {
            fingers = [...fingers, finger];
          } else {
            fingers = [...fingers];
            fingers[fingerIndex] = finger;
          }
        }
        logEvent(
          "scanner",
          `prints for ${currentFGP} read in ${Date.now() - readingFrom} ms ` +
            `(${spent.image} ms getting the images, scored and encoded on the phone)`,
        );
        if (
          keepSlap &&
          (currentFGP === FGP.PLAIN_RIGHT_FOUR_FINGERS ||
            currentFGP === FGP.PLAIN_LEFT_FOUR_FINGERS)
        ) {
          // The slap as the scanner took it, before the next capture
          // replaces it.
          const mark = Date.now();
          const frame = await ExpoIdentifiModule.getLastFrame();
          if (frame) capturedSlaps[currentFGP] = frame;
          logEvent(
            "scanner",
            frame
              ? `whole slap ${currentFGP}: ${frame.width}x${frame.height} in ${Date.now() - mark} ms`
              : `whole slap ${currentFGP}: not available`,
          );
        }
      }

      logEvent("scanner", `capture screen done in ${Date.now() - startedAt} ms`);
      if (isDeviceCaptureAwaited()) {
        // The fingerprint screen is waiting to review these before saving.
        finishDeviceCapture({
          fingers: captured,
          pngs: capturedPngs,
          slaps: capturedSlaps,
        });
      } else {
        setValue("transaction.fingers", fingers);
        setValue("pngFingers", pngFingers);
      }
      router.back();
    } catch (e) {
      setSpinnerMessage("");
      console.error("Error capturing fingerprints", e);
      // Start from a fresh connection next time: this one may be the problem.
      keepConnection.current = false;
      ExpoIdentifiModule.disconnect().catch(() => undefined);
      await ExpoIdentifiModule.clearMemoryBuffer().catch((error) => {
        console.error(
          "Error clearing memory buffer after capture failure",
          error,
        );
      });
      if (e instanceof MissingSegmentError) {
        logEvent("fingers", `scanner found ${e.found} of ${e.expected} fingers`);
        Alert.alert(
          tHelper("fingersNotAllFoundTitle"),
          tHelper("fingersNotAllFoundBody")
            .replace("{found}", String(e.found))
            .replace("{expected}", String(e.expected)),
          [
            { text: tHelper("recapture"), onPress: () => doCapture() },
            {
              text: tHelper("cancel"),
              style: "cancel",
              onPress: () => router.back(),
            },
          ],
        );
        return;
      }
      Alert.alert(tHelper("error"), tHelper("scannerCaptureFailed"), [
        { text: tHelper("retry"), onPress: () => doCapture() },
        {
          // As on Android: put the sensors back to rest, then try again.
          text: tHelper("fpReset"),
          onPress: async () => {
            setSpinnerMessage(tHelper("deviceResetting"));
            const answered = await ExpoIdentifiModule.resetSensors().catch(
              () => false,
            );
            setSpinnerMessage("");
            if (answered) doCapture();
            else {
              Alert.alert(tHelper("fpReset"), tHelper("scannerResetFailed"), [
                { text: tHelper("ok"), onPress: () => router.back() },
              ]);
            }
          },
        },
        {
          text: tHelper("cancel"),
          style: "cancel",
          onPress: () => router.back(),
        },
      ]);
    } finally {
      captureInFlight.current = false;
    }
  }, [
    fgp,
    rolled,
    keepSlap,
    stepsKey,
    getAutofillValue,
    getValue,
    router,
    setValue,
  ]);

  useFocusEffect(
    useCallback(() => {
      cancelled.current = false;
      leaving.current = false;
      doCapture();
      return () => {
        cancelled.current = true;
        // Leaving without prints (cancel, failure): tell whoever is waiting.
        finishDeviceCapture(null);
        // Only a capture that is running needs stopping; a cancel sent to an
        // idle scanner is never answered.
        if (scanning.current) {
          ExpoIdentifiModule.stopCapture().catch(() =>
            logEvent("scanner", "stop on leaving did not answer"),
          );
        }
        if (!keepConnection.current) ExpoIdentifiModule.disconnect();
      };
    }, [doCapture]),
  );

  const handleOmit = () => {
    if (isDeviceCaptureAwaited()) {
      // DoD, as on Android: stop the capture first. One finger is simply
      // omitted; with several, the operator picks which ones.
      if (!scanning.current || pickRequested.current) return;
      if (fgpFromMultiple[capturingAt].length === 1) {
        omitted.current.push({
          reason: "UP",
          fingerPosition: capturingAt as FGP,
        });
      } else {
        pickRequested.current = true;
      }
      ExpoIdentifiModule.stopCapture().then(() => {
        // A scanner that never stopped: let Omit be tried again.
        setTimeout(() => {
          if (scanning.current) pickRequested.current = false;
        }, 1500);
      });
      return;
    }
    if (fgpFromMultiple[capturingAt].length === 1) {
      const handlePress = (reason: AmputatedOrBandaged["reason"]) => {
        omitted.current.push({
          reason,
          fingerPosition: capturingAt as FGP,
        });
        ExpoIdentifiModule.stopCapture();
      };

      Alert.alert(tHelper("omitFingerImage"), tHelper("omitReason"), [
        {
          text: tHelper("amputated"),
          onPress: () => {
            handlePress("XX");
          },
        },
        {
          text: tHelper("bandaged"),
          onPress: () => {
            handlePress("UP");
          },
        },
        { text: tHelper("cancel"), style: "cancel" },
      ]);
    } else {
      setOmittedFingerDialogVisible(true);
    }
  };

  const handleOmissionSubmit = (omittedFingers: AmputatedOrBandaged[]) => {
    omitted.current = [...omitted.current, ...omittedFingers];
    setOmittedFingerDialogVisible(false);
    ExpoIdentifiModule.stopCapture();
  };

  const handleCancel = () => {
    // Once is enough, and leaving does not wait on the scanner: the screen's
    // clean-up stops a capture that is still running.
    if (leaving.current) return;
    leaving.current = true;
    cancelled.current = true;
    logEvent("scanner", "capture cancelled by the operator");
    router.back();
  };

  const closeOmittedFingerDialog = () => {
    setOmittedFingerDialogVisible(false);
  };

  const guide = fingerGuideImage(capturingAt);
  const isDod = getAutofillValue("appSettings")?.collectionMode !== "DHS";
  const dangerColor = useThemeColor({}, "danger");

  return (
    <SafeAreaView style={StyleSheet.absoluteFill}>
      {spinnerMessage && <Spinner message={spinnerMessage} />}
      {/* As on Android: the hand with the fingers to place shown in green. */}
      {guide && (
        <Image source={guide} style={styles.guide} resizeMode="contain" />
      )}
      <H2 style={styles.text}>
        {rolled && capturingAt >= 1 && capturingAt <= 10
          ? tHelper(`roll${capturingAt}` as Parameters<typeof tHelper>[0])
          : `${tHelper("place")} ${tHelper(`${capturingAt}`)} ${tHelper("onScanner")}`}
      </H2>
      {rollAgain && (
        <Text style={[styles.lowQuality, { color: dangerColor }]}>
          {tHelper("scannerRollAgain")}
        </Text>
      )}
      {lowQuality && (
        <Text style={[styles.lowQuality, { color: dangerColor }]}>
          {tHelper("scannerLowQuality")}
        </Text>
      )}
      <ExpoIdentifiView
        style={[styles.view, !isDod && styles.viewLight]}
      />
      {rolled ? (
        // A finger that cannot be printed is omitted at its flat capture,
        // and then is not asked for rolled at all: only Cancel here.
        <View style={styles.rolledButtons}>
          <Button
            variant="secondary"
            text={tHelper("cancelCapture")}
            onPress={handleCancel}
          />
        </View>
      ) : (
        <FormButtons
          onCancel={handleCancel}
          cancelText={tHelper("cancelCapture")}
          onSubmit={handleOmit}
          submitText={`${tHelper("omit")} ${capturingAt > 12 ? tHelper("finger") : tHelper(`${capturingAt}`)}`}
        />
      )}
      <OmitFingerPicker
        fingers={picker?.fingers ?? null}
        onDone={(omittedNow) => picker?.done(omittedNow)}
      />
      <OmitFingerDialog
        captureSequence={capturingAt}
        onSubmit={handleOmissionSubmit}
        toggle={closeOmittedFingerDialog}
        visible={omittedFingerDialogVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Black around the print, like the scanner's own image.
  view: {
    flex: 1,
    backgroundColor: "#000",
  },
  // DHS mode keeps the light surround it has always had.
  viewLight: { backgroundColor: "#F8F8F8" },
  rolledButtons: { padding: 10 },
  guide: { width: 160, height: 160, alignSelf: "center", marginTop: 12 },
  lowQuality: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  text: {
    textAlign: "center",
    marginVertical: 10,
    // flex: 1,
  },
  buttons: {},
});
