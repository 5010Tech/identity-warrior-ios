import { Base64Image, fingerprintCaptureSequence, NFIQScore } from "@/types";
import { logEvent } from "@/util/fieldLog";
import { TimeoutError, withTimeout } from "@/util/withTimeout";
import { requireNativeModule } from "expo-modules-core";

const ExpoIdentifi = requireNativeModule("ExpoIdentifi");

export interface IrisCaptureResult {
  leftImage: Base64Image;
  rightImage: Base64Image;
  leftTotalScore: number;
  leftUsableArea: number;
  rightTotalScore: number;
  rightUsableArea: number;
  imageHeight?: number;
  imageWidth?: number;
  horizontalPixelDensity?: number;
  verticalPixelDensity?: number;
  imageBitsPerPixelQuantity?: number;
}

export interface IrisCaptureStatusEvent {
  irisCaptureStatus: number;
}

export interface IrisPreviewFrameEvent {}

// Whether this app holds a connection to the scanner. Connecting takes
// several seconds, so a connection is kept and reused between captures.
let connected = false;
// The minimum NFIQ score last set on this connection (it only needs setting once).
let minimumNfiqSet: number | null = null;

let connectInFlight: Promise<unknown> | null = null;

const isConnected = () => connected;

/** When iris preview frames were last reported (every few seconds while they flow). */
export const irisFrames = { at: 0 };

/**
 * Whether an iris capture has gone wrong since the last good one: the iris
 * screen offers its Reset only then.
 */
export const irisTrouble = { seen: false };

// What the native side sends to the scanner and hears back goes in the field
// log. A disconnection the scanner (or the network) made is noted too, so the
// next capture connects afresh instead of talking to a dead link.
try {
  ExpoIdentifi.addListener?.(
    "onScannerDebug",
    ({ message }: { message: string }) => {
      logEvent("sdk", message);
      if (message.startsWith("iris (")) irisFrames.at = Date.now();
      if (message === "got onDisconnection") {
        connected = false;
        minimumNfiqSet = null;
      }
    },
  );
} catch {
  // an older build without the event
}

/** quiet: a miss is expected (looking for a scanner), so it is not logged as an error. */
const connect = async (quiet = false) => {
  if (connected) return "Connected";
  // One connection attempt at a time: a second caller waits on the first
  // rather than starting another and orphaning it.
  if (!connectInFlight) {
    connectInFlight = (async () => {
      try {
        // A scanner just switched on shows its Wi-Fi network before it is
        // ready for the app, and refuses the connection until then. That is
        // retried for a short while instead of being reported as a failure.
        for (let attempt = 1; ; attempt += 1) {
          try {
            const result = await ExpoIdentifi.connect();
            connected = true;
            return result;
          } catch (error) {
            const refused = /refused/i.test(String((error as Error)?.message));
            if (!refused || attempt >= 6) throw error;
            logEvent(
              "scanner",
              `connection refused (scanner still starting?); try ${attempt + 1} in 3 s`,
            );
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        }
      } finally {
        connectInFlight = null;
      }
    })();
  }
  try {
    return await connectInFlight;
  } catch (error) {
    if (!quiet) console.error("Failed to connect to device", error);
    throw error;
  }
};

const disconnect = async () => {
  connected = false;
  minimumNfiqSet = null;
  try {
    return await withTimeout(ExpoIdentifi.disconnect(), 5000);
  } catch (error) {
    // A scanner that is out of reach cannot answer; the connection is
    // treated as closed either way.
    console.warn("The scanner did not answer the disconnect", error);
    return undefined;
  }
};

// Captures under way (fingerprint or iris), so the scanner is not released
// from under one.
let capturing = 0;
const isCapturing = () => capturing > 0;

const captureFingerprints = async (
  fingerAmount: 1 | 2 | 4 = 1,
  savedAtIndex: number = -1,
  fingerprintCaptureSequence?: fingerprintCaptureSequence,
): Promise<{ raw: Base64Image; image: Base64Image }> => {
  capturing += 1;
  try {
    if (fingerprintCaptureSequence === "tenRolled") {
      return await ExpoIdentifi.startCaptureRollFinger(savedAtIndex);
    }
    const methods = {
      1: ExpoIdentifi.startCaptureOneFinger,
      2: ExpoIdentifi.startCaptureTwoFinger,
      4: ExpoIdentifi.startCaptureFourFinger,
    };
    return await methods[fingerAmount](savedAtIndex);
  } catch (error) {
    console.error("Failed to capture fingerprints", error);
    throw error;
  } finally {
    capturing -= 1;
  }
};

/**
 * Asks the scanner to stop the capture in hand. A scanner that is idle, or
 * that the phone can no longer reach, never answers; that is not a fault, so
 * it is noted as a warning and the caller carries on.
 */
const stopCapture = async () => {
  try {
    return await withTimeout(ExpoIdentifi.cancelFpCapture(), 5000);
  } catch (error) {
    console.warn("The scanner did not answer the request to stop", error);
    return undefined;
  }
};

const getDeviceInfo = async () => {
  try {
    const doGetdeviceInfo = async () => ({
      serialNumber: await ExpoIdentifi.getDeviceSerialNumber(),
      modelNumber: await ExpoIdentifi.getModelNumber(),
    });
    return await withTimeout(doGetdeviceInfo(), 5000);
  } catch (error) {
    console.error("Failed to get device info", error);
    throw error;
  }
};

/**
 * Makes sure the fingerprint sensor is powered, as the Android app does
 * before every capture. Returns "on", "turned-on", "off" (it would not power
 * up), or "unknown" when the scanner did not say or this build cannot ask.
 */
// One sensor at a time: with the iris camera and the fingerprint sensor both
// powered, the scanner stopped answering part-way through a capture. So each
// is switched off before the other is switched on.
let irisOn = false;
let fpOn = false;

const ensureFpPowerOn = async (): Promise<
  "on" | "turned-on" | "off" | "unknown"
> => {
  if (irisOn) {
    irisOn = false;
    const off = await withTimeout(ExpoIdentifi.setIrisPowerOff(), 5000)
      .then(() => true)
      .catch(() => false);
    logEvent(
      "scanner",
      `iris camera off before fingerprints${off ? "" : ": no answer"}`,
    );
  }
  if (typeof ExpoIdentifi.getFpPowerStatus !== "function") return "unknown";
  try {
    if (await withTimeout(ExpoIdentifi.getFpPowerStatus(), 5000)) {
      fpOn = true;
      return "on";
    }
    const on = await withTimeout(ExpoIdentifi.setFpPowerOn(), 10000);
    fpOn = Boolean(on);
    return on ? "turned-on" : "off";
  } catch (error) {
    console.warn("Could not check the fingerprint sensor's power", error);
    return "unknown";
  }
};

const clearMemoryBuffer = async (savedAtIndex = -1) => {
  try {
    console.log("Clearing memory buffer at index", savedAtIndex);
    return await withTimeout(
      ExpoIdentifi.clearSavedFpImages(savedAtIndex),
      8000,
    );
  } catch (error) {
    console.error("Failed to clear memory buffer", error);
    throw error;
  }
};

const setMinimumNFIQScore = async (nfiq: NFIQScore) => {
  if (connected && minimumNfiqSet === nfiq) return undefined;
  try {
    minimumNfiqSet = nfiq;
    console.log("Setting minimum NFIQ score to", nfiq);
    return await withTimeout(ExpoIdentifi.setMinimumNFIQScore(nfiq), 5000);
  } catch (error) {
    minimumNfiqSet = null;
    console.error("Failed to set minimum NFIQ score", error);
    throw error;
  }
};

const getNFIQScore = async (savedAtIndex: number): Promise<NFIQScore> => {
  try {
    return Number(
      await withTimeout(ExpoIdentifi.getNFIQScore(savedAtIndex), 5000),
    );
  } catch (error) {
    console.error("Failed to get NFIQ score", error);
    throw error;
  }
};

/**
 * The image of one finger from the last capture, or null when the scanner has
 * no finger at that index: it found fewer fingers than the capture asked for.
 * An up-to-date build answers null straight away; an older one never answers,
 * so a timeout is read the same way.
 */
/** A whole captured frame: PNG for the screen, WSQ for the EBTS file. */
export interface CapturedFrame {
  png: Base64Image;
  wsq: Base64Image;
  width: number;
  height: number;
}

/**
 * The whole frame of the capture just finished (a four-finger slap as one
 * image). Null on a build without it, or if the scanner sent no picture.
 */
const getLastFrame = async (): Promise<CapturedFrame | null> => {
  if (typeof ExpoIdentifi.getLastFrame !== "function") return null;
  try {
    const frame = (await withTimeout(
      ExpoIdentifi.getLastFrame(),
      20000,
    )) as CapturedFrame | null;
    return frame?.wsq ? frame : null;
  } catch (error) {
    console.warn("Could not get the whole captured frame", error);
    return null;
  }
};

const getSegmentedImage = async (
  savedAtIndex: number,
): Promise<Base64Image | null> => {
  try {
    const image = await withTimeout(
      ExpoIdentifi.getSegmentedFpImage(savedAtIndex),
      5000,
    );
    return (image as Base64Image | null) || null;
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.warn(`No fingerprint segment at index ${savedAtIndex}`);
      return null;
    }
    console.error("Failed to get segmented image", error);
    throw error;
  }
};

export type CapturedPrint = {
  png: Base64Image;
  wsq: Base64Image;
  nfiq: NFIQScore;
  width: number;
  height: number;
};

/**
 * One finger from the last capture, with its WSQ and quality score worked out
 * on the phone. Null when the scanner has no finger at that index. On a build
 * without the phone-side code, falls back to asking the scanner for each.
 */
const getPrint = async (
  savedAtIndex: number,
): Promise<CapturedPrint | null> => {
  if (typeof ExpoIdentifi.getSegmentedFpPrint === "function") {
    try {
      const print = (await withTimeout(
        ExpoIdentifi.getSegmentedFpPrint(savedAtIndex),
        8000,
      )) as CapturedPrint | null;
      return print?.wsq ? { ...print, nfiq: Number(print.nfiq) } : null;
    } catch (error) {
      // No finger at this index is answered at once (with nothing), so
      // silence here means the scanner has stopped answering: let the caller
      // treat it as a lost link rather than as a finger that is not there.
      console.error("Failed to get fingerprint", error);
      throw error;
    }
  }
  const png = await getSegmentedImage(savedAtIndex);
  if (!png) return null;
  const nfiq = await getNFIQScore(savedAtIndex);
  const wsq = await getWSQImage(savedAtIndex);
  return { png, wsq, nfiq, width: 800, height: 750 };
};

const getWSQImage = async (savedAtIndex: number): Promise<Base64Image> => {
  try {
    return await withTimeout(
      ExpoIdentifi.getWSQEncodedFpImageFromImageSavedAt(savedAtIndex),
      5000,
    );
  } catch (error) {
    console.error("Failed to get WSQ image", error);
    throw error;
  }
};

const getIrisPowerStatus = async (): Promise<boolean> => {
  try {
    return Boolean(await withTimeout(ExpoIdentifi.getIrisPowerStatus(), 5000));
  } catch (error) {
    console.error("Failed to get iris power status", error);
    throw error;
  }
};

const setIrisPowerOn = async (): Promise<boolean> => {
  try {
    return Boolean(await withTimeout(ExpoIdentifi.setIrisPowerOn(), 30000));
  } catch (error) {
    console.error("Failed to power on iris sensor", error);
    throw error;
  }
};

const setIrisPowerOff = async (): Promise<void> => {
  try {
    await withTimeout(ExpoIdentifi.setIrisPowerOff(), 5000);
  } catch (error) {
    console.warn("The scanner did not answer the iris power-off", error);
    throw error;
  }
};

const cancelIrisCapture = async (): Promise<void> => {
  try {
    await withTimeout(ExpoIdentifi.cancelIrisCapture(), 5000);
  } catch (error) {
    irisTrouble.seen = true;
    console.warn("The scanner did not answer the iris cancel", error);
    throw error;
  }
};

/**
 * Makes sure the iris camera is powered. This is the slow part of an iris
 * capture (ten seconds and more), and it is its own step so the caller can
 * check, before starting the capture, that the operator is still waiting for
 * it.
 */
const ensureIrisPowerOn = async (): Promise<void> => {
  // A warm-up already under way is doing exactly this: wait for it.
  if (warmUpInFlight) await warmUpInFlight;
  if (fpOn && typeof ExpoIdentifi.setFpPowerOff === "function") {
    fpOn = false;
    const off = await withTimeout(ExpoIdentifi.setFpPowerOff(), 5000)
      .then(() => true)
      .catch(() => false);
    logEvent(
      "iris",
      `fingerprint sensor off before iris${off ? "" : ": no answer"}`,
    );
  }
  const irisPowered = await getIrisPowerStatus();
  logEvent("iris", `sensor power ${irisPowered ? "on" : "off; turning on"}`);
  if (irisPowered) {
    irisOn = true;
    return;
  }
  const powerOn = await setIrisPowerOn();
  logEvent("iris", `sensor power-on answered ${powerOn}`);
  if (!powerOn) throw new Error("Failed to power on iris sensor");
  irisOn = true;
};

/**
 * Notes the scanner's battery level and software versions in the field log,
 * once per connection: what a support case with the maker will ask for, and
 * a low battery is a likely suspect when a scanner stops answering mid-capture.
 */
const logScannerInfo = async () => {
  const ask = async (name: string): Promise<string> => {
    if (typeof ExpoIdentifi[name] !== "function") return "?";
    try {
      return String(await withTimeout(ExpoIdentifi[name](), 4000));
    } catch {
      return "no answer";
    }
  };
  let library = "?";
  try {
    library = String(ExpoIdentifi.getLibraryVersion());
  } catch {
    // not available
  }
  const battery = await ask("getBatteryPercentage");
  const firmware = await ask("getFirmwareVersion");
  logEvent(
    "scanner",
    // Underscores for dots: the log blanks anything shaped like an address.
    `battery ${battery}%, firmware ${firmware.replace(/\./g, "_")}, library ${library.replace(/\./g, "_")}`,
  );
};

let warmUpInFlight: Promise<void> | null = null;

/**
 * Gets the scanner ready ahead of time, in the background: connects and, for
 * a scanner with an iris camera, powers the camera on. Both take ten seconds
 * and more, so doing them when a collection starts (while the operator is on
 * biographics and the face photo) means fingerprints and irises start at
 * once when their turn comes. Failing here is not an error: the capture
 * screens do the same steps themselves if they still need doing.
 */
// Counts collections starting, so the end of one that has already been
// followed by another does not release the scanner from under the new one.
let sessions = 0;

const warmUp = (withIris: boolean): Promise<void> => {
  sessions += 1;
  if (!warmUpInFlight) {
    warmUpInFlight = (async () => {
      try {
        const startedAt = Date.now();
        const fresh = !connected;
        await connect(true);
        if (fresh) await logScannerInfo();
        // Connecting only. Neither sensor is powered ahead of time: which
        // one is wanted is not known yet, and both on at once hangs the
        // scanner. Each capture screen powers its own.
        void withIris;
        logEvent(
          "scanner",
          `connected ahead of time in ${Date.now() - startedAt} ms`,
        );
      } catch {
        logEvent("scanner", "could not get ready ahead of time");
      } finally {
        warmUpInFlight = null;
      }
    })();
  }
  return warmUpInFlight;
};

/** Resolves once any warm-up under way has finished. */
const settleWarmUp = () => warmUpInFlight ?? Promise.resolve();

/** The collection is over: iris camera off, connection closed. */
const endSession = async () => {
  const mine = sessions;
  await settleWarmUp();
  // Another collection began while this one was closing: it keeps the scanner.
  if (sessions !== mine) return;
  if (!connected) return;
  if (irisOn) {
    irisOn = false;
    await withTimeout(ExpoIdentifi.setIrisPowerOff(), 5000).catch(() =>
      undefined,
    );
  }
  if (fpOn && typeof ExpoIdentifi.setFpPowerOff === "function") {
    fpOn = false;
    await withTimeout(ExpoIdentifi.setFpPowerOff(), 5000).catch(
      () => undefined,
    );
  }
  await disconnect();
  logEvent("scanner", "collection over: scanner released");
};

/** Starts the capture; the iris camera must already be powered. */
const startIrisCapture = async (): Promise<IrisCaptureResult> => {
  capturing += 1;
  try {
    logEvent("iris", "start capture sent to the scanner");
    return await withTimeout(ExpoIdentifi.startCaptureIris(), 60000);
  } catch (error) {
    console.warn("Failed to capture iris", error);
    throw error;
  } finally {
    capturing -= 1;
  }
};

/**
 * Puts the scanner's sensors back to rest when one is stuck (still lit or
 * blinking, not answering a capture): stops any capture, powers both sensors
 * off, clears the saved prints and drops the connection, so the next capture
 * starts from scratch. Returns whether the scanner answered at all; one that
 * answers nothing needs turning off and on by hand.
 */
const resetSensors = async (): Promise<boolean> => {
  let answered = 0;
  const step = async (name: string, run: () => Promise<unknown>, ms: number) => {
    try {
      await withTimeout(run(), ms);
      answered += 1;
      logEvent("scanner", `reset: ${name} answered`);
    } catch {
      logEvent("scanner", `reset: ${name} did not answer`);
    }
  };
  logEvent("scanner", "reset requested");
  if (!connected) {
    try {
      await ExpoIdentifi.connect();
      connected = true;
    } catch {
      logEvent("scanner", "reset: could not connect");
      return false;
    }
  }
  await step("iris cancel", () => ExpoIdentifi.cancelIrisCapture(), 3000);
  await step("fingerprint cancel", () => ExpoIdentifi.cancelFpCapture(), 3000);
  irisOn = false;
  fpOn = false;
  await step("iris power off", () => ExpoIdentifi.setIrisPowerOff(), 5000);
  if (typeof ExpoIdentifi.setFpPowerOff === "function") {
    await step("fingerprint power off", () => ExpoIdentifi.setFpPowerOff(), 5000);
  }
  await step("clear saved prints", () => ExpoIdentifi.clearSavedFpImages(-1), 5000);
  await disconnect();
  // The cancels go unanswered on an idle sensor, so they do not count.
  logEvent("scanner", `reset done: ${answered} step(s) answered`);
  return answered > 0;
};

const addIrisCaptureStatusListener = (
  listener: (event: IrisCaptureStatusEvent) => void,
) => ExpoIdentifi.addListener("onIrisCaptureStatus", listener);

/** Where a fingerprint capture stands, from the native side. */
export type FpCaptureProgress =
  | "stalled"
  | "streaming"
  | "complete"
  | "status";

/**
 * stalled: the preview has stopped (the scanner has its image and is sending
 * it); streaming: the preview is running again; complete: the image is in.
 */
const addFpCaptureProgressListener = (
  /** status: what the scanner reported (state "status" only; 1 = quality too low). */
  listener: (event: { state: FpCaptureProgress; status?: number }) => void,
) => ExpoIdentifi.addListener("onFpCaptureProgress", listener);

const addIrisPreviewFrameListener = (listener: () => void) =>
  ExpoIdentifi.addListener("onIrisPreviewFrame", listener);

export default {
  connect,
  disconnect,
  captureFingerprints,
  getDeviceInfo,
  stopCapture,
  clearMemoryBuffer,
  setMinimumNFIQScore,
  getNFIQScore,
  getWSQImage,
  getSegmentedImage,
  getPrint,
  getLastFrame,
  startIrisCapture,
  cancelIrisCapture,
  getIrisPowerStatus,
  setIrisPowerOn,
  setIrisPowerOff,
  addIrisCaptureStatusListener,
  addIrisPreviewFrameListener,
  addFpCaptureProgressListener,
  ensureFpPowerOn,
  ensureIrisPowerOn,
  warmUp,
  settleWarmUp,
  endSession,
  resetSensors,
  isConnected,
  isCapturing,
};
