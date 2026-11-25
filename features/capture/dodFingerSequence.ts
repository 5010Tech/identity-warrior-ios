import { AppSettings } from "@/types";
import { FGP } from "@/types/BiometricData";

/**
 * DoD fingerprint capture plan, following the Android app's Fingerprint
 * Settings (FingerPrompt.determineFingerPrintPrompt):
 * - 4-4-2:   four fingers of one hand, four fingers of the other, both thumbs.
 * - 4-1-4-1: four fingers then the thumb of one hand, then the other hand.
 * - The starting hand (App Settings, right by default) comes first.
 * - Automatic walks through every step; manual lets the operator tap each one.
 *
 * Steps use the slap position codes, which every capture path already knows
 * how to split into single fingers (fgpFromMultiple).
 */
export interface DodFingerPlan {
  steps: FGP[];
  automatic: boolean;
}

export const getDodFingerPlan = (
  appSettings: Partial<AppSettings> = {},
): DodFingerPlan | null => {
  // DoD is the default mode when none has been saved.
  if (appSettings.collectionMode === "DHS") return null;
  // Automatic unless set to manual, which is the Android default too.
  const automatic = appSettings.dodFingerCaptureMode !== "manual";
  const leftFirst = appSettings.startingHand === "Left";
  const left =
    appSettings.dodFingerSequence === "4-1-4-1"
      ? [FGP.PLAIN_LEFT_FOUR_FINGERS, FGP.LEFT_THUMB]
      : [FGP.PLAIN_LEFT_FOUR_FINGERS];
  const right =
    appSettings.dodFingerSequence === "4-1-4-1"
      ? [FGP.PLAIN_RIGHT_FOUR_FINGERS, FGP.RIGHT_THUMB]
      : [FGP.PLAIN_RIGHT_FOUR_FINGERS];
  const steps = leftFirst ? [...left, ...right] : [...right, ...left];
  if (appSettings.dodFingerSequence !== "4-1-4-1") {
    steps.push(FGP.PLAIN_LEFT_AND_RIGHT_THUMBS);
  }
  return { steps, automatic };
};

/**
 * DHS mode with Starting Hand set to Left: the contactless capture order for
 * the chosen sequence. Undefined when the standard right-first order applies.
 */
export const getLeftFirstContactlessSteps = (
  appSettings?: Partial<AppSettings>,
): FGP[] | undefined => {
  if (appSettings?.startingHand !== "Left") return undefined;
  switch (appSettings.fingerprintCaptureSequence) {
    case "tenFlat":
      return [
        FGP.PLAIN_LEFT_FOUR_FINGERS,
        FGP.PLAIN_RIGHT_FOUR_FINGERS,
        FGP.PLAIN_LEFT_AND_RIGHT_THUMBS,
      ];
    case "twoFlat":
      return [FGP.LEFT_INDEX, FGP.RIGHT_INDEX];
    default:
      return undefined;
  }
};
