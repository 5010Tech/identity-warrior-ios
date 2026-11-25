import { AppSettings } from "@/types";
import { Device } from "@/types/Device";
import { FGP } from "@/types/BiometricData";
import { translationKey } from "@/translations/translationHelper";
import { AdditionalFGP, CaptureSequence } from "./types";
import { fgpFromMultiple } from "./util";

export type Hand = "left" | "right";

/**
 * How many fingers the scanner in use takes at once. This decides which
 * capture buttons each hand shows, as on Android (LeftHandFragment /
 * RightHandFragment):
 *  - contactless: phone camera (no device connected)
 *  - four:   four-finger platen (IdentiFI-50 and up; IB Kojak / Five-0)
 *  - two:    two-finger platen (IdentiFI-45; IB Watson / Sherlock)
 *  - single: one finger at a time (IdentiFI-25/30, IB Columbo / Danno, and
 *            the Bluetooth scanner)
 */
export type ScannerClass = "contactless" | "four" | "two" | "single";

export const getScannerClass = (device?: Device | null): ScannerClass => {
  if (!device) return "contactless";
  if (device.connectionType === "bluetooth") return "single";
  // Same cut-offs the capture screen uses to split a step for the platen.
  const model = parseInt(device.modelNumber?.match(/\d+/)?.[0] ?? "0");
  if (model < 45) return "single";
  if (model < 50) return "two";
  return "four";
};

export interface FingerButton {
  /** What to capture: one finger, a pair, a slap or both thumbs. */
  code: CaptureSequence;
  label: translationKey;
  /** The single fingers this capture produces. */
  fingers: FGP[];
}

const button = (code: CaptureSequence, label?: translationKey): FingerButton => ({
  code,
  label: label ?? (code.toString() as translationKey),
  fingers: fgpFromMultiple[code],
});

/** Index, middle, ring, little, thumb: the order they are listed and shown. */
export const HAND_FINGERS: Record<Hand, FGP[]> = {
  left: [
    FGP.LEFT_INDEX,
    FGP.LEFT_MIDDLE,
    FGP.LEFT_RING,
    FGP.LEFT_LITTLE,
    FGP.LEFT_THUMB,
  ],
  right: [
    FGP.RIGHT_INDEX,
    FGP.RIGHT_MIDDLE,
    FGP.RIGHT_RING,
    FGP.RIGHT_LITTLE,
    FGP.RIGHT_THUMB,
  ],
};

/** Short name of a finger under its captured image. */
export const FINGER_NAMES: translationKey[] = [
  "fingerIndex",
  "fingerMiddle",
  "fingerRing",
  "fingerLittle",
  "fingerThumb",
];

/**
 * The capture buttons for one hand.
 *  - DHS two flat: the index finger only.
 *  - DHS ten rolled, or a single-finger scanner: each finger on its own.
 *  - Two-finger scanner: index & middle, ring & little, thumb.
 *  - Four-finger scanner or contactless: the hand slap, then both thumbs
 *    together (4-4-2) or this hand's thumb (4-1-4-1).
 */
export const getFingerButtons = (
  hand: Hand,
  scanner: ScannerClass,
  appSettings: Partial<AppSettings> = {},
): FingerButton[] => {
  const left = hand === "left";
  const [index, , , , thumb] = HAND_FINGERS[hand];
  const isDod = appSettings.collectionMode !== "DHS";
  const dhsSequence = appSettings.fingerprintCaptureSequence;

  if (!isDod && dhsSequence === "twoFlat") return [button(index)];
  if (scanner === "single" || (!isDod && dhsSequence === "tenRolled")) {
    return HAND_FINGERS[hand].map((finger) => button(finger));
  }
  if (scanner === "two") {
    return [
      button(
        left
          ? AdditionalFGP.LEFT_INDEX_AND_MIDDLE
          : AdditionalFGP.RIGHT_INDEX_AND_MIDDLE,
      ),
      button(
        left
          ? AdditionalFGP.LEFT_RING_AND_LITTLE
          : AdditionalFGP.RIGHT_RING_AND_LITTLE,
      ),
      button(thumb),
    ];
  }
  const slap = button(
    left ? FGP.PLAIN_LEFT_FOUR_FINGERS : FGP.PLAIN_RIGHT_FOUR_FINGERS,
    left ? "leftHandSlap" : "rightHandSlap",
  );
  // One thumb at a time in 4-1-4-1, and in Selfie Mode on the phone camera:
  // you can't hold the phone and present both thumbs (as on Android).
  const singleThumbs =
    (isDod && appSettings.dodFingerSequence === "4-1-4-1") ||
    (scanner === "contactless" && !!appSettings.selfieMode);
  return [
    slap,
    singleThumbs
      ? button(thumb)
      : button(FGP.PLAIN_LEFT_AND_RIGHT_THUMBS, "thumbs"),
  ];
};

/**
 * The DoD capture steps as this scanner takes them, one capture per step, so
 * each capture gets its own review straight away:
 *  - four-finger scanner: as planned (each slap, then the thumbs).
 *  - two-finger scanner: 2-2-1 a hand, as on Android: index & middle, ring &
 *    little, then that hand's thumb, and only then the other hand.
 *  - single-finger scanner: every finger of a hand on its own, thumb last,
 *    then the other hand.
 * Hands keep the plan's order (starting hand).
 */
export const scannerSteps = (
  steps: CaptureSequence[],
  scanner: ScannerClass,
): CaptureSequence[] => {
  if (scanner !== "two" && scanner !== "single") return steps;
  const hands: { slap: FGP; pairs: CaptureSequence[]; thumbs: FGP[] }[] = [
    {
      slap: FGP.PLAIN_RIGHT_FOUR_FINGERS,
      pairs: [
        AdditionalFGP.RIGHT_INDEX_AND_MIDDLE,
        AdditionalFGP.RIGHT_RING_AND_LITTLE,
      ],
      thumbs: [FGP.RIGHT_THUMB, FGP.PLAIN_RIGHT_THUMB],
    },
    {
      slap: FGP.PLAIN_LEFT_FOUR_FINGERS,
      pairs: [
        AdditionalFGP.LEFT_INDEX_AND_MIDDLE,
        AdditionalFGP.LEFT_RING_AND_LITTLE,
      ],
      thumbs: [FGP.LEFT_THUMB, FGP.PLAIN_LEFT_THUMB],
    },
  ];
  // Thumbs are wanted if the plan has them at all, together or singly.
  const wantsThumbs = (hand: (typeof hands)[number]) =>
    steps.includes(FGP.PLAIN_LEFT_AND_RIGHT_THUMBS) ||
    steps.some((step) => hand.thumbs.includes(step as FGP));
  return hands
    .filter((hand) => steps.includes(hand.slap))
    .sort((a, b) => steps.indexOf(a.slap) - steps.indexOf(b.slap))
    .flatMap<CaptureSequence>((hand) => [
      ...(scanner === "single" ? fgpFromMultiple[hand.slap] : hand.pairs),
      ...(wantsThumbs(hand) ? [hand.thumbs[0]] : []),
    ]);
};
