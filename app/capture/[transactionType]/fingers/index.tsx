import { awaitDeviceCapture } from "@/features/capture/deviceCapture";
import { SetValueFn } from "@/features/capture/context/CaptureProvider";
import { logEvent } from "@/util/fieldLog";
import { Button } from "@/components/Button";
import { useActiveDevice } from "@/components/device/activeDevice";
import { ConnectionFailedDialog } from "@/components/device/ConnectionFailedDialog";
import { runSlapshotCapture } from "@/components/Slapshot/runSlapshotCapture";
import { useSlapshotContext } from "@/components/Slapshot/SlapshotContext";
import { Spinner } from "@/components/Spinner";
import { Col, Row } from "@/components/Structure";
import { useCaptureValue } from "@/features/capture/context/hooks";
import {
  FINGER_NAMES,
  getFingerButtons,
  getScannerClass,
  scannerSteps,
  Hand,
  HAND_FINGERS,
} from "@/features/capture/fingerButtons";
import {
  FingerButtonCard,
  FingerResultTile,
  FingerReview,
  MissingReason,
  PrintViewer,
  HandTabs,
} from "@/features/capture/FingerHandViews";
import {
  AdditionalFGP,
  CaptureSequence,
  SlapImage,
} from "@/features/capture/types";
import { SafeAreaView, Text, useThemeColor, View } from "@/components/themed";
import { tHelper, translationKey } from "@/translations/translationHelper";
import { FGP, Finger } from "@/types/BiometricData";
import { mapToFingerType } from "@/types/util";
import { useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { fingerprintCaptureSequence } from "@/types";
import { useCaptureActions } from "@/features/capture/context/hooks";
import { fgpFromMultiple, runBTCapture } from "@/features/capture/util";
import {
  getDodFingerPlan,
  getLeftFirstContactlessSteps,
} from "@/features/capture/dodFingerSequence";

/**
 * Steps for the phone camera, which takes a whole hand at a time: a
 * two-finger scanner's pair steps (used when falling back to contactless)
 * become that hand's slap.
 */
const toContactlessSteps = (steps?: CaptureSequence[]): FGP[] | undefined =>
  steps && [
    ...new Set(
      steps.map((step) =>
        step === AdditionalFGP.LEFT_INDEX_AND_MIDDLE ||
        step === AdditionalFGP.LEFT_RING_AND_LITTLE
          ? FGP.PLAIN_LEFT_FOUR_FINGERS
          : step === AdditionalFGP.RIGHT_INDEX_AND_MIDDLE ||
              step === AdditionalFGP.RIGHT_RING_AND_LITTLE
            ? FGP.PLAIN_RIGHT_FOUR_FINGERS
            : step,
      ),
    ),
  ];

export default function FingerprintCaptureScreen() {
  const router = useRouter();
  const { setValue, getValue } = useCaptureActions();
  const appSettings = useAutofillSelector((state) => state.appSettings);
  // DoD mode: 4-4-2 / 4-1-4-1 steps from App Settings. Null in DHS mode.
  const dodPlan = getDodFingerPlan(appSettings);
  const fingerprintCaptureSequence: fingerprintCaptureSequence = dodPlan
    ? "tenFlat"
    : appSettings.fingerprintCaptureSequence;
  const [cameraPermission] = useCameraPermissions();
  const alertShown = useRef(false);

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && !alertShown.current) {
      alertShown.current = true;
      Alert.alert(tHelper("cameraPerm"), tHelper("allowCamera"), [
        {
          text: tHelper("openSettings"),
          onPress: async () => {
            const supported = await Linking.canOpenURL("app-settings:");
            if (supported) {
              await Linking.openURL("app-settings:");
            } else {
              console.warn("Unable to open app settings");
            }
          },
        },
        {
          text: tHelper("cancel"),
          style: "cancel",
          onPress: () => router.back(),
        },
      ]);
    }
  }, [cameraPermission, router]);

  const {
    connecting,
    activeDevice,
    connectToDevice,
    connectionFailed,
    closeConnectionFailedDialog,
  } = useActiveDevice();

  const capturingAt = useRef<{ fgp: FGP; i: number } | null>(null);
  // The DoD steps of the run in progress, kept for Retry and contactless fallback.
  const stepsAt = useRef<CaptureSequence[] | undefined>(undefined);
  const viewModel = useSlapshotContext();

  const [loadingMessage, setLoadingMessage] = useState("");
  // The starting hand (App Settings) is the tab shown first.
  const [hand, setHand] = useState<Hand>(
    appSettings.startingHand === "Left" ? "left" : "right",
  );
  const fingers = useCaptureValue<Finger[]>("transaction.fingers") ?? [];
  // What has been captured, as of the last save. The capture store only
  // catches up on the next screen update, so right after a save it still
  // reports the old list; this holds the new one until it does. Automatic
  // capture reads it to decide what is still missing.
  const savedFingers = useRef<Finger[] | null>(null);
  useEffect(() => {
    savedFingers.current = null;
  }, [fingers]);
  const currentFingers = () =>
    savedFingers.current ?? getValue<Finger[]>("transaction.fingers") ?? [];

  // MAP and CAR on a scanner, as on Android: once a hand's flat prints are
  // in, each of its fingers is rolled as well (index, middle, ring, little,
  // thumb). A finger omitted from the flats is not rolled.
  const dodTot = useCaptureValue<string>("dodTot");
  const needsRolled =
    !!dodPlan &&
    ["map", "car"].includes((dodTot ?? "").toLowerCase()) &&
    activeDevice?.connectionType === "wifi";
  const rolledFingers = useCaptureValue<Finger[]>("rolledFingers") ?? [];
  const pngRolled =
    useCaptureValue<Record<string, string>>("pngRolledFingers") ?? {};
  const savedRolled = useRef<Finger[] | null>(null);
  useEffect(() => {
    savedRolled.current = null;
  }, [rolledFingers]);
  const currentRolled = () =>
    savedRolled.current ?? getValue<Finger[]>("rolledFingers") ?? [];

  // The saved print opened full screen from the hand view, if any.
  const [viewing, setViewing] = useState<FGP | null>(null);
  // The same, for a rolled print.
  const [viewingRolled, setViewingRolled] = useState<FGP | null>(null);

  // A contactless capture waiting to be reviewed: Save keeps it, Recapture
  // throws it away and runs the same capture again.
  const [review, setReview] = useState<{
    fingers: Finger[];
    pngs: Record<string, string>;
    /** MAP and CAR: the slap as one image, shown whole at the review. */
    slapPng?: string;
    done: (
      keep: boolean,
      reasons?: Partial<Record<number, MissingReason>>,
    ) => void;
  } | null>(null);
  // The whole slap of the capture now going to review, if it has one.
  const pendingSlap = useRef<string | undefined>(undefined);
  const slaps =
    useCaptureValue<Partial<Record<number, SlapImage>>>("slaps") ?? {};
  // The slap opened full screen from the hand view (13 right, 14 left).
  const [viewingSlap, setViewingSlap] = useState<number | null>(null);
  // Automatic capture (App Settings) starts by itself, once, on the way in.
  const startRef = useRef<(() => Promise<unknown>) | null>(null);
  // While an automatic capture is on its way in, the hand layout stays hidden
  // behind a progress wheel, so it doesn't flash up before the capture opens.
  const [autoPending, setAutoPending] = useState(
    () => !!dodPlan?.automatic && !fingers.length,
  );
  const cover = useThemeColor({}, "background");
  const wheel = useThemeColor({}, "progress");
  const autoStarted = useRef(false);
  const ready = !!viewModel && !!cameraPermission?.granted;
  useEffect(() => {
    if (!ready || autoStarted.current) return;
    logEvent(
      "fingers",
      `opened: mode ${dodPlan ? (dodPlan.automatic ? "automatic" : "manual") : "dhs"}, ${fingers.length} print(s) so far`,
    );
    if (!dodPlan?.automatic || fingers.length) {
      autoStarted.current = true;
      setAutoPending(false);
      return;
    }
    // Wait for the screen to finish sliding in: a capture started during the
    // transition doesn't open. The "started" mark is only set when it fires,
    // so an effect that is torn down and re-run still gets its turn.
    const timer = setTimeout(() => {
      if (autoStarted.current) return;
      autoStarted.current = true;
      logEvent("fingers", "automatic capture starting");
      (startRef.current?.() ?? Promise.resolve())
        .catch(() => undefined)
        .finally(() => setAutoPending(false));
    }, 900);
    return () => clearTimeout(timer);
    // Only on the way in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const pager = useRef<ScrollView>(null);
  const pagerSettled = useRef(false);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);

  if (!viewModel || !cameraPermission?.granted) return <Spinner />;

  /**
   * Runs a contactless capture, then shows the review. What the capture
   * would save is held back until Save; Recapture runs it again.
   */
  const captureWithReview = async (
    run: (hold: SetValueFn) => Promise<void>,
    existing: Finger[],
  ) => {
    for (;;) {
      const writes: [string, unknown][] = [];
      pendingSlap.current = undefined;
      const hold = ((name: string, value: unknown) => {
        writes.push([name, value]);
      }) as SetValueFn;
      await run(hold);
      const captured: Finger[] = [];
      const pngs: Record<string, string> = {};
      writes.forEach(([name, value]) => {
        if (name === "transaction.fingers") {
          (value as Finger[]).forEach((finger) => {
            if (!existing.includes(finger)) captured.push(finger);
          });
        } else if (/^transaction\.fingers\[\d+\]$/.test(name)) {
          captured.push(value as Finger);
        } else if (name.startsWith("pngFingers.")) {
          pngs[name.slice("pngFingers.".length)] = value as string;
        }
      });
      // Cancelled or failed: nothing to review, nothing to save.
      if (!captured.length) return false;
      const { keep, reasons } = await new Promise<{
        keep: boolean;
        reasons?: Partial<Record<number, MissingReason>>;
      }>((answer) =>
        setReview({
          fingers: captured,
          pngs,
          slapPng: pendingSlap.current,
          done: (kept, why) => answer({ keep: kept, reasons: why }),
        }),
      );
      setReview(null);
      // Each finger marked missing in the capture takes the reason the
      // operator chose for it at the review, in place of the capture's
      // stand-in.
      if (keep && reasons) {
        captured.forEach((finger) => {
          const reason = reasons[Number(finger.fingerPosition)];
          if (reason && finger.missingFingerprints?.length) {
            finger.missingFingerprints = finger.missingFingerprints.map(
              (missing) => ({ ...missing, reason }),
            );
          }
        });
      }
      if (keep) {
        // Work out the list as it will be once these are stored, so the next
        // step knows about them straight away.
        let next = [...currentFingers()];
        writes.forEach(([name, value]) => {
          const slot = /^transaction\.fingers\[(-?\d+)\]$/.exec(name);
          if (name === "transaction.fingers") next = [...(value as Finger[])];
          else if (slot) {
            const finger = value as Finger;
            const at = next.findIndex(
              (f) => Number(f.fingerPosition) === Number(finger.fingerPosition),
            );
            if (at >= 0) next[at] = finger;
            else next.push(finger);
          }
        });
        savedFingers.current = next;
        logEvent(
          "fingers",
          `saving; positions now [${next
            .map((finger) => Number(finger.fingerPosition))
            .join(" ")}]`,
        );
        writes.forEach(([name, value]) =>
          setValue(name as Parameters<SetValueFn>[0], value),
        );
        logEvent("fingers", `kept ${captured.length} print(s)`);
        return true;
      }
      logEvent("fingers", "recapture chosen at review");
    }
  };

  const captureFingerprints = async (
    fgp?: FGP,
    fingerIndex?: number,
    retry?: boolean,
    steps: CaptureSequence[] | undefined = dodPlan?.steps,
  ) => {
    if (fgp) {
      capturingAt.current = { fgp, i: fingerIndex ?? 0 };
      stepsAt.current = undefined;
    } else if (retry) {
      fgp = capturingAt.current?.fgp;
      fingerIndex = capturingAt.current?.i;
      steps = stepsAt.current;
    } else {
      capturingAt.current = null;
      stepsAt.current = steps;
    }
    if (fgp) steps = undefined;
    const existingFingers = currentFingers();
    logEvent(
      "fingers",
      `capture on ${getScannerClass(activeDevice)}: ${fgp ? `finger ${fgp}` : `steps ${(steps ?? []).join(",") || "full sequence"}`}`,
    );
    connectionFailed && closeConnectionFailedDialog();
    if (activeDevice) {
      const connected = await connectToDevice();
      if (!connected) {
        return;
      }
      if (activeDevice.connectionType === "wifi" && dodPlan) {
        // DoD: the scanner screen hands its prints back for review; nothing
        // is saved until Save, and Recapture opens the scanner again.
        const target = fgp
          ? `/capture/[transactionType]/fingers/device?fgp=${fgp}`
          : `/capture/[transactionType]/fingers/device?steps=${(steps ?? dodPlan.steps).join(",")}${needsRolled ? "&slap=1" : ""}`;
        let first = true;
        return await captureWithReview(async (hold) => {
          if (!first && !(await connectToDevice())) return;
          first = false;
          const answer = awaitDeviceCapture();
          router.navigate(target as Parameters<typeof router.navigate>[0]);
          const result = await answer;
          if (!result?.fingers.length) return;
          // Let the scanner screen finish sliding away before the review.
          await new Promise((resolve) => setTimeout(resolve, 450));
          const merged = [...existingFingers];
          result.fingers.forEach((finger) => {
            const at = merged.findIndex(
              (f) => Number(f.fingerPosition) === Number(finger.fingerPosition),
            );
            if (at >= 0) merged[at] = finger;
            else merged.push(finger);
          });
          hold("transaction.fingers", merged);
          // MAP and CAR: the slap as one image goes with its fingers.
          const wholeSlaps = Object.entries(result.slaps ?? {});
          if (wholeSlaps.length) {
            hold("slaps", {
              ...(getValue<Partial<Record<number, SlapImage>>>("slaps") ?? {}),
              ...result.slaps,
            });
            pendingSlap.current = wholeSlaps[wholeSlaps.length - 1][1]?.png;
          }
          Object.entries(result.pngs).forEach(([type, png]) =>
            hold(`pngFingers.${type}` as Parameters<SetValueFn>[0], png),
          );
        }, existingFingers);
      }
      if (activeDevice.connectionType === "wifi") {
        router.navigate(
          fgp
            ? `/capture/[transactionType]/fingers/device?fgp=${fgp}`
            : steps
              ? `/capture/[transactionType]/fingers/device?steps=${steps.join(",")}`
              : "/capture/[transactionType]/fingers/device",
        );
      }
      if (activeDevice.connectionType === "bluetooth") {
        runBTCapture(
          setLoadingMessage,
          setValue,
          fgp,
          fingerIndex,
          fingerprintCaptureSequence,
          steps as FGP[] | undefined,
          existingFingers,
          appSettings.startingHand === "Left",
        );
      }
    } else {
      return await captureWithReview(
        (hold) =>
          runSlapshotCapture(
            viewModel,
            hold,
            fgp,
            fingerIndex,
            fingerprintCaptureSequence,
            fgp
              ? undefined
              : (toContactlessSteps(
                  // The whole DoD sequence on the camera: Selfie Mode's order.
                  steps === dodPlan?.steps ? cameraSteps : steps,
                ) ?? getLeftFirstContactlessSteps(appSettings)),
            existingFingers,
          ),
        existingFingers,
      );
    }
  };

  /**
   * Rolls one finger on the scanner, then shows the review: Save keeps it
   * with the rolled prints, Recapture rolls it again. False when cancelled.
   */
  const captureRolled = async (fgp: FGP): Promise<boolean> => {
    logEvent("fingers", `rolled capture: finger ${fgp}`);
    for (;;) {
      connectionFailed && closeConnectionFailedDialog();
      if (!(await connectToDevice())) return false;
      const answer = awaitDeviceCapture();
      router.navigate(
        `/capture/[transactionType]/fingers/device?fgp=${fgp}&rolled=1` as Parameters<
          typeof router.navigate
        >[0],
      );
      const result = await answer;
      const print = result?.fingers.find(
        (finger) => Number(finger.fingerPosition) === fgp,
      );
      if (!result || !print?.image) return false;
      // Let the scanner screen finish sliding away before the review.
      await new Promise((resolve) => setTimeout(resolve, 450));
      const keep = await new Promise<boolean>((answered) =>
        setReview({
          fingers: [print],
          pngs: result.pngs,
          done: (kept) => answered(kept),
        }),
      );
      setReview(null);
      if (!keep) {
        logEvent("fingers", "recapture chosen at rolled review");
        continue;
      }
      const next = [
        ...currentRolled().filter(
          (finger) => Number(finger.fingerPosition) !== fgp,
        ),
        print,
      ];
      savedRolled.current = next;
      setValue("rolledFingers", next);
      setValue("pngRolledFingers", {
        ...(getValue<Record<string, string>>("pngRolledFingers") ?? {}),
        ...result.pngs,
      });
      logEvent(
        "fingers",
        `rolled saved; positions now [${next
          .map((finger) => Number(finger.fingerPosition))
          .join(" ")}]`,
      );
      return true;
    }
  };

  /** The fingers of a hand still to roll: flat print in, not omitted, not rolled. */
  const rollsDue = (side: Hand): FGP[] => {
    if (!needsRolled) return [];
    const flats = currentFingers();
    const flatOf = (fgp: FGP) =>
      flats.find((finger) => Number(finger.fingerPosition) === fgp);
    // Not before the whole hand's flats are done.
    if (!HAND_FINGERS[side].every(flatOf)) return [];
    const rolledNow = currentRolled();
    return HAND_FINGERS[side].filter(
      (fgp) =>
        !flatOf(fgp)?.missingFingerprints?.length &&
        !rolledNow.some((finger) => Number(finger.fingerPosition) === fgp),
    );
  };

  /**
   * Rolls whatever is due, the starting hand first. False when the operator
   * cancelled one, which stops the automatic run.
   */
  const runRolls = async (): Promise<boolean> => {
    const order: Hand[] =
      appSettings.startingHand === "Left" ? ["left", "right"] : ["right", "left"];
    for (const side of order) {
      for (const fgp of rollsDue(side)) {
        showHand(side);
        if (!(await captureRolled(fgp))) return false;
      }
    }
    return true;
  };

  /**
   * Automatic capture. On the phone camera each step of the sequence is its
   * own round, as on Android: capture, review, Save or Recapture, then the
   * next step. Steps already captured are skipped, and cancelling a capture
   * stops the run. A connected scanner runs its own sequence as before.
   */
  // Selfie Mode on the phone camera overrides 4-4-2: you can't hold the phone
  // and present both thumbs, so each hand's thumb follows its four fingers
  // (the 4-1-4-1 order), as on Android.
  const cameraSteps: FGP[] = dodPlan
    ? appSettings.selfieMode
      ? (getDodFingerPlan({ ...appSettings, dodFingerSequence: "4-1-4-1" })
          ?.steps ?? dodPlan.steps)
      : dodPlan.steps
    : [];

  const runAutomatic = async () => {
    // A Wi-Fi scanner (IdentiFI) goes step by step with a review, like the
    // camera; a Bluetooth scanner still runs its own sequence.
    const onScanner = activeDevice?.connectionType === "wifi";
    if ((activeDevice && !onScanner) || !dodPlan) return captureFingerprints();
    // On a scanner each capture is its own step (pairs and single thumbs on
    // a two-finger platen), so every capture is reviewed straight away.
    const runSteps = onScanner
      ? (scannerSteps(dodPlan.steps, getScannerClass(activeDevice)) as FGP[])
      : cameraSteps;
    let lastStep: FGP | undefined;
    let stopped = false;
    // Set once rolling has begun: runRolls shows the hand it is working on.
    let rolling = false;
    setAutoPending(true);
    logEvent("fingers", `automatic run over steps [${runSteps.join(" ")}]`);
    try {
      for (const step of runSteps) {
        const existing = currentFingers();
        const have = (fgp: FGP) =>
          existing.some((finger) => Number(finger.fingerPosition) === fgp);
        if (fgpFromMultiple[step].every(have)) continue;
        lastStep = step;
        logEvent(
          "fingers",
          `automatic step ${step}; have positions [${existing
            .map((finger) => Number(finger.fingerPosition))
            .join(" ")}]`,
        );
        const saved = onScanner
          ? await captureFingerprints(undefined, undefined, false, [step])
          : await captureWithReview(
              (hold) =>
                runSlapshotCapture(
                  viewModel,
                  hold,
                  undefined,
                  undefined,
                  fingerprintCaptureSequence,
                  [step],
                  existing,
                ),
              existing,
            );
        lastStep = step;
        if (!saved) {
          stopped = true;
          break;
        }
        // A hand whose flats are now complete is rolled before moving on.
        if (onScanner && !(await runRolls())) {
          stopped = true;
          rolling = true;
          break;
        }
      }
      // Flats all in already (coming back to the screen): the rolls alone.
      if (!stopped && onScanner && rollsDue("left").length + rollsDue("right").length) {
        rolling = true;
        await runRolls();
      }
    } finally {
      setAutoPending(false);
      // Come back on the hand that was being collected (the one just
      // finished, or the one whose capture was cancelled).
      if (lastStep !== undefined && !rolling) {
        const positions = fgpFromMultiple[lastStep];
        const isLeft = (fgp: FGP) => HAND_FINGERS.left.includes(fgp);
        if (positions.every(isLeft)) showHand("left");
        else if (!positions.some(isLeft)) showHand("right");
      }
    }
  };
  startRef.current = runAutomatic;

  /**
   * A capture the operator starts by hand. In automatic mode, once its prints
   * are saved the automatic run carries on with whatever is still missing;
   * cancelling leaves things as they are.
   */
  const captureByHand = async (
    ...args: Parameters<typeof captureFingerprints>
  ) => {
    const saved = await captureFingerprints(...args);
    if (
      saved &&
      dodPlan?.automatic &&
      (!activeDevice || activeDevice.connectionType === "wifi")
    ) {
      await runAutomatic();
    }
  };

  const indexOf = (fgp: FGP) =>
    fingers.findIndex((finger) => Number(finger.fingerPosition) === fgp);
  // A button goes away once everything it captures is in; the prints show
  // below it instead, and tapping one captures that finger again.
  const scanner = getScannerClass(activeDevice);
  const buttonsFor = (side: Hand) =>
    getFingerButtons(side, scanner, appSettings).filter(
      ({ fingers: produced }) => produced.some((fgp) => indexOf(fgp) < 0),
    );
  const capturedFor = (side: Hand) =>
    HAND_FINGERS[side].flatMap((fgp, i) => {
      const finger = fingers[indexOf(fgp)];
      return finger ? [{ fgp, name: FINGER_NAMES[i], finger }] : [];
    });

  const rolledFor = (side: Hand) =>
    HAND_FINGERS[side].flatMap((fgp, i) => {
      const finger = rolledFingers.find(
        (item) => Number(item.fingerPosition) === fgp,
      );
      return finger ? [{ fgp, name: FINGER_NAMES[i], finger }] : [];
    });
  /** A roll started by hand; in automatic mode the rest then follows. */
  const rollByHand = async (fgp: FGP) => {
    if ((await captureRolled(fgp)) && dodPlan?.automatic) await runAutomatic();
  };

  // The two hands sit side by side in a pager: swipe between them or tap a tab.
  const showHand = (side: Hand) => {
    setHand(side);
    pager.current?.scrollTo({ x: side === "left" ? 0 : pageWidth });
  };

  const handleFallback = async () => {
    connectionFailed && closeConnectionFailedDialog();
    const { fgp, i } = capturingAt.current ?? { fgp: undefined, i: undefined };
    capturingAt.current = null;
    const existing = currentFingers();
    await captureWithReview(
      (hold) =>
        runSlapshotCapture(
          viewModel,
          hold,
          fgp,
          i,
          fingerprintCaptureSequence,
          fgp
            ? undefined
            : (toContactlessSteps(stepsAt.current) ??
                getLeftFirstContactlessSteps(appSettings)),
          existing,
        ),
      existing,
    );
  };

  return (
    <>
      <SafeAreaView edges={["bottom", "top"]}>
        {(connecting || loadingMessage) && (
          <Spinner message={loadingMessage || tHelper("connectingToDevice")} />
        )}
        <View style={styles.container}>
          <HandTabs hand={hand} onChange={showHand} />
          <View
            style={styles.scroll}
            onLayout={(e) => {
              setPageWidth(e.nativeEvent.layout.width);
              setPageHeight(e.nativeEvent.layout.height);
            }}
          >
            {pageWidth > 0 && (
              <ScrollView
                ref={pager}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentOffset={{ x: hand === "left" ? 0 : pageWidth, y: 0 }}
                // The starting offset can be applied before the pages have
                // their width, leaving the other hand peeking in: set it
                // again once they do.
                onContentSizeChange={() => {
                  if (pagerSettled.current) return;
                  pagerSettled.current = true;
                  pager.current?.scrollTo({
                    x: hand === "left" ? 0 : pageWidth,
                    animated: false,
                  });
                }}
                onMomentumScrollEnd={(e) =>
                  setHand(
                    e.nativeEvent.contentOffset.x < pageWidth / 2
                      ? "left"
                      : "right",
                  )
                }
              >
                {(["left", "right"] as Hand[]).map((side) => {
                  // MAP and CAR: a hand whose slap was kept whole shows that
                  // one image in place of its four fingers' prints.
                  const slapCode =
                    side === "left"
                      ? FGP.PLAIN_LEFT_FOUR_FINGERS
                      : FGP.PLAIN_RIGHT_FOUR_FINGERS;
                  const slap = needsRolled ? slaps[slapCode] : undefined;
                  const captured = capturedFor(side).filter(
                    ({ fgp }) => !slap || !fgpFromMultiple[slapCode].includes(fgp),
                  );
                  // Size the prints so the whole hand fits without scrolling:
                  // the height left after the capture buttons, shared by the
                  // rows of prints (two to a row), less each tile's own
                  // name, badge and padding.
                  const rows = Math.ceil(captured.length / 2) || 1;
                  const room =
                    pageHeight - buttonsFor(side).length * 78 - (rows - 1) * 10;
                  const printHeight = Math.max(
                    56,
                    Math.min(150, Math.floor(room / rows) - 82),
                  );
                  return (
                    <ScrollView
                      key={side}
                      style={{ width: pageWidth }}
                      contentContainerStyle={styles.hand}
                      showsVerticalScrollIndicator={false}
                    >
                      {buttonsFor(side).map(
                        ({ code, label, fingers: produced }) => (
                          <FingerButtonCard
                            key={code}
                            label={label}
                            onPress={() =>
                              produced.length === 1
                                ? captureByHand(
                                    code as FGP,
                                    // A finger not captured yet goes at the end.
                                    indexOf(code as FGP) < 0
                                      ? fingers.length
                                      : indexOf(code as FGP),
                                  )
                                : captureByHand(
                                    undefined,
                                    undefined,
                                    false,
                                    [code],
                                  )
                            }
                          />
                        ),
                      )}
                      {!!slap && (
                        <Pressable
                          accessibilityRole="button"
                          style={styles.slapTile}
                          onPress={() => setViewingSlap(slapCode)}
                        >
                          <Image
                            resizeMode="contain"
                            style={styles.slapImage}
                            source={{ uri: `data:image/png;base64,${slap.png}` }}
                          />
                        </Pressable>
                      )}
                      {!!captured.length && (
                        <View style={styles.results}>
                          {captured.map(({ fgp, name, finger }) => (
                            <FingerResultTile
                              key={fgp}
                              fingerPosition={fgp}
                              name={name}
                              finger={finger}
                              imageHeight={printHeight}
                              onPress={() => setViewing(fgp)}
                            />
                          ))}
                        </View>
                      )}
                      {/* MAP and CAR: this hand's rolled prints, once its
                          flats are in. A button for each still to roll. */}
                      {needsRolled &&
                        (rollsDue(side).length > 0 ||
                          rolledFor(side).length > 0) && (
                          <>
                            <Text style={styles.rolledTitle}>
                              {tHelper("rolledPrints")}
                            </Text>
                            {rollsDue(side).map((fgp) => (
                              <FingerButtonCard
                                key={`roll-${fgp}`}
                                label={`rolled${fgp}` as translationKey}
                                onPress={() => rollByHand(fgp)}
                              />
                            ))}
                            {!!rolledFor(side).length && (
                              <View style={styles.results}>
                                {rolledFor(side).map(({ fgp, name, finger }) => (
                                  <FingerResultTile
                                    key={`rolled-${fgp}`}
                                    fingerPosition={fgp}
                                    name={name}
                                    finger={finger}
                                    png={pngRolled[mapToFingerType(fgp)]}
                                    imageHeight={printHeight}
                                    onPress={() => setViewingRolled(fgp)}
                                  />
                                ))}
                              </View>
                            )}
                          </>
                        )}
                    </ScrollView>
                  );
                })}
              </ScrollView>
            )}
          </View>
          <Row>
            {/* DoD has no Start: automatic capture starts by itself and the
                hand buttons cover the rest. DHS keeps its Start as it was. */}
            {!dodPlan && (
              <Col>
                <Button
                  text={tHelper("start")}
                  onPress={() => captureFingerprints()}
                />
              </Col>
            )}
            <Col>
              <Button text={tHelper("done")} onPress={router.back} />
            </Col>
          </Row>
        </View>
        {autoPending && (
          <View style={[styles.autoCover, { backgroundColor: cover }]}>
            {/* One wheel at a time: the spinner above has its own. */}
            {!connecting && !loadingMessage && (
              <ActivityIndicator size="large" color={wheel} />
            )}
          </View>
        )}
      </SafeAreaView>
      <PrintViewer
        print={
          viewing === null
            ? null
            : {
                title: viewing.toString() as translationKey,
                png: getValue<string>(
                  `pngFingers.${mapToFingerType(viewing)}` as Parameters<
                    typeof getValue
                  >[0],
                ),
              }
        }
        onClose={() => setViewing(null)}
        onRecapture={() => {
          const fgp = viewing;
          setViewing(null);
          if (fgp !== null) void captureByHand(fgp, indexOf(fgp));
        }}
      />
      <PrintViewer
        print={
          viewingRolled === null
            ? null
            : {
                title: `rolled${viewingRolled}` as translationKey,
                png: pngRolled[mapToFingerType(viewingRolled)],
              }
        }
        onClose={() => setViewingRolled(null)}
        onRecapture={() => {
          const fgp = viewingRolled;
          setViewingRolled(null);
          if (fgp !== null) void rollByHand(fgp);
        }}
      />
      <PrintViewer
        print={
          viewingSlap === null
            ? null
            : {
                title:
                  viewingSlap === FGP.PLAIN_LEFT_FOUR_FINGERS
                    ? "leftHandSlap"
                    : "rightHandSlap",
                png: slaps[viewingSlap]?.png,
              }
        }
        onClose={() => setViewingSlap(null)}
        onRecapture={() => {
          const code = viewingSlap;
          setViewingSlap(null);
          if (code !== null) {
            void captureByHand(undefined, undefined, false, [code as FGP]);
          }
        }}
      />
      <FingerReview
        fingers={review?.fingers ?? null}
        pngs={review?.pngs ?? {}}
        slapPng={review?.slapPng}
        onRecapture={() => review?.done(false)}
        onSave={(reasons) => review?.done(true, reasons)}
      />
      <ConnectionFailedDialog
        visible={connectionFailed}
        onRetry={() => captureFingerprints(undefined, undefined, true)}
        onClose={closeConnectionFailedDialog}
        onFallback={handleFallback}
        deviceType={activeDevice?.connectionType}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
    height: "100%",
    justifyContent: "space-between",
  },
  scroll: { flex: 1 },
  autoCover: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  hand: { gap: 10, paddingBottom: 6 },
  rolledTitle: { fontSize: 15, fontWeight: "700", marginTop: 4 },
  slapTile: {
    width: "100%",
    aspectRatio: 1.6,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 6,
  },
  slapImage: { width: "100%", height: "100%" },
  results: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: 10,
    rowGap: 10,
    backgroundColor: "transparent",
  },
});
