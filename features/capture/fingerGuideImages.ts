import { CaptureSequence } from "@/features/capture/types";
import { captureSequence } from "@/features/capture/util";
import { FGP } from "@/types/BiometricData";
import { ImageSourcePropType } from "react-native";
import { FINGER_GUIDE_PNGS } from "./fingerGuideData";

/**
 * The hand pictures the Android app shows while a scanner is capturing
 * (FingerPrompt.updateFingerprintGuideImage): a hand with the fingers to place
 * on the sensor in green. Which one shows follows what the scanner is asked
 * for, and that follows the size of its platen: all four fingers on a
 * four-finger scanner, two at a time on a two-finger one, one at a time on a
 * single-finger one.
 */
const GUIDES: Partial<Record<CaptureSequence, ImageSourcePropType>> = {
  [FGP.PLAIN_RIGHT_FOUR_FINGERS]: FINGER_GUIDE_PNGS.right_slap,
  [FGP.PLAIN_LEFT_FOUR_FINGERS]: FINGER_GUIDE_PNGS.left_slap,
  [FGP.PLAIN_LEFT_AND_RIGHT_THUMBS]: FINGER_GUIDE_PNGS.thumbs,
  [captureSequence.RIGHT_INDEX_AND_MIDDLE]: FINGER_GUIDE_PNGS.right_index_middle,
  [captureSequence.RIGHT_RING_AND_LITTLE]: FINGER_GUIDE_PNGS.right_ring_little,
  [captureSequence.LEFT_INDEX_AND_MIDDLE]: FINGER_GUIDE_PNGS.left_index_middle,
  [captureSequence.LEFT_RING_AND_LITTLE]: FINGER_GUIDE_PNGS.left_ring_little,
  [FGP.RIGHT_THUMB]: FINGER_GUIDE_PNGS.right_thumb,
  [FGP.PLAIN_RIGHT_THUMB]: FINGER_GUIDE_PNGS.right_thumb,
  [FGP.RIGHT_INDEX]: FINGER_GUIDE_PNGS.right_index,
  [FGP.RIGHT_MIDDLE]: FINGER_GUIDE_PNGS.right_middle,
  [FGP.RIGHT_RING]: FINGER_GUIDE_PNGS.right_ring,
  [FGP.RIGHT_LITTLE]: FINGER_GUIDE_PNGS.right_little,
  [FGP.LEFT_THUMB]: FINGER_GUIDE_PNGS.left_thumb,
  [FGP.PLAIN_LEFT_THUMB]: FINGER_GUIDE_PNGS.left_thumb,
  [FGP.LEFT_INDEX]: FINGER_GUIDE_PNGS.left_index,
  [FGP.LEFT_MIDDLE]: FINGER_GUIDE_PNGS.left_middle,
  [FGP.LEFT_RING]: FINGER_GUIDE_PNGS.left_ring,
  [FGP.LEFT_LITTLE]: FINGER_GUIDE_PNGS.left_little,
};

/** The guide picture for what is being captured, if there is one. */
export const fingerGuideImage = (capturing: CaptureSequence) =>
  GUIDES[capturing];
