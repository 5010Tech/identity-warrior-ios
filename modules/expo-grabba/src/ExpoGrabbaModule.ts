import { logEvent } from "@/util/fieldLog";
import { requireOptionalNativeModule } from "expo-modules-core";

/** A Grabba A-Series device, as the app knows it. */
export type GrabbaInfo = {
  serial: number;
  model: string;
  firmware?: string;
  hardware?: string;
  software?: string;
  manufacturer?: string;
  /** The device has finished setting itself up after connecting. */
  ready?: boolean;
  fingerprintReady?: boolean;
  asleep?: boolean;
};

export type GrabbaFound = { serial: number; model: string };

export type GrabbaConnection = Partial<GrabbaInfo> & { connected: boolean };

/** What kind of image the device sent. */
export type GrabbaImageFacts = {
  bytes: number;
  /** Its first bytes, in hex. */
  magic: string;
  type?: string;
  width?: number;
  height?: number;
  bitsPerPixel?: number;
  dpiX?: number;
  dpiY?: number;
  bmpPixelsPerMetre?: number;
};

export type GrabbaScan = GrabbaImageFacts & {
  /** The image as a PNG, base64, when it can be read as a picture. */
  png?: string;
  nistScore: number;
  compressionType: number;
  /** Images sent before the final one. */
  previews: number;
  firstPreview?: GrabbaImageFacts;
  segmentBytes?: number;
  segmentHex?: string;
  milliseconds?: number;
};

export type GrabbaFingerprintProgress = {
  state: "started" | "preview" | "final";
  count?: number;
  bytes?: number;
};

/** What to ask the scanner for: a roll, or that many fingers flat. */
export const GrabbaScanType = {
  roll: 0,
  oneFinger: 1,
  twoFingers: 2,
  threeFingers: 3,
  fourFingers: 4,
} as const;

type Subscription = { remove: () => void };

// Missing in a build from before the Grabba was added: everything here then
// does nothing, and the app carries on without one.
const Native = requireOptionalNativeModule("ExpoGrabba");

const listen = <T>(event: string, listener: (body: T) => void): Subscription =>
  Native?.addListener?.(event, listener) ?? { remove: () => undefined };

// What the native side and the vendor's SDK report goes in the field log.
try {
  listen<{ message: string }>("onGrabbaDebug", ({ message }) =>
    logEvent("grabba", message),
  );
} catch {
  // No log lines from the native side, then.
}

const missing = () => Promise.reject(new Error("Grabba support is not in this build"));

const ExpoGrabba = {
  /** Whether this build of the app can talk to a Grabba at all. */
  available: !!Native,
  sdkVersion: (): Promise<string> => Native?.sdkVersion() ?? missing(),
  /** Look for devices. False when already looking or connected. */
  startDiscovery: (): Promise<boolean> =>
    Native?.startDiscovery() ?? Promise.resolve(false),
  stopDiscovery: (): Promise<void> =>
    Native?.stopDiscovery() ?? Promise.resolve(),
  /** Connect to a device seen in the search in hand. */
  connect: (serial: number): Promise<GrabbaInfo> =>
    Native?.connect(serial) ?? missing(),
  disconnect: (): Promise<void> => Native?.disconnect() ?? Promise.resolve(),
  getConnected: async (): Promise<GrabbaInfo | null> => {
    const body: GrabbaConnection | undefined = await Native?.getConnected();
    return body?.connected ? (body as GrabbaInfo) : null;
  },
  wake: (): Promise<void> => Native?.wake() ?? Promise.resolve(),
  /**
   * One scan. As a picture the device sends a small JPEG, for looking at
   * only; as WSQ it sends the print as it goes in a record.
   */
  scanFingerprint: (scanType: number, wsq = false): Promise<GrabbaScan> =>
    Native?.scanFingerprint(scanType, wsq) ?? missing(),
  stopFingerprint: (): Promise<void> =>
    Native?.stopFingerprint() ?? Promise.resolve(),
  onFound: (listener: (found: GrabbaFound) => void) =>
    listen("onGrabbaFound", listener),
  onConnection: (listener: (connection: GrabbaConnection) => void) =>
    listen("onGrabbaConnection", listener),
  onFingerprint: (listener: (progress: GrabbaFingerprintProgress) => void) =>
    listen("onGrabbaFingerprint", listener),
};

export default ExpoGrabba;
