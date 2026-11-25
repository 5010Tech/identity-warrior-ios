import { Finger } from "@/types/BiometricData";
import { SlapImage } from "./types";

/** What one visit to the scanner screen captured. */
export interface DeviceCaptureResult {
  fingers: Finger[];
  /** Screen images (PNG, base64) by finger type. */
  pngs: Record<string, string>;
  /** MAP and CAR: a slap as one image, by position (13 right, 14 left). */
  slaps?: Partial<Record<number, SlapImage>>;
}

/**
 * Hand-off between the fingerprint screen and the scanner screen (IdentiFI).
 * In the DoD flow the fingerprint screen waits here for the scanner screen's
 * prints, so it can show the review before anything is saved. Without someone
 * waiting, the scanner screen saves its prints itself, as it always has.
 */
let waiting: ((result: DeviceCaptureResult | null) => void) | null = null;

/** Call before opening the scanner screen; resolves when it closes. */
export const awaitDeviceCapture = () =>
  new Promise<DeviceCaptureResult | null>((resolve) => {
    waiting?.(null);
    waiting = resolve;
  });

export const isDeviceCaptureAwaited = () => waiting !== null;

/** The scanner screen's answer: its prints, or null when cancelled or failed. */
export const finishDeviceCapture = (result: DeviceCaptureResult | null) => {
  const resolve = waiting;
  waiting = null;
  resolve?.(result);
};
