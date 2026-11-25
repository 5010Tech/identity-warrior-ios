import { FingerType } from "@/modules/slapshot-capture-library/src";
import { Base64Image, FGP, Finger } from "@/types";
import { Transaction } from "@/types/Transaction";

export interface CaptureState {
  fetching: string[];
  /** True while a recovered collection is being read back from the phone. */
  restoring?: boolean;
  error?: any;
  transaction: Transaction;
  biographicsComplete?: boolean;
  pngFingers: Record<FingerType, Base64Image>;
  /**
   * DoD MAP and CAR on a scanner: each finger rolled, in addition to the flat
   * prints in transaction.fingers. At most one per finger position.
   */
  rolledFingers: Finger[];
  /** The rolled prints' screen images (PNG, base64), by finger type. */
  pngRolledFingers: Partial<Record<FingerType, Base64Image>>;
  /**
   * DoD MAP and CAR on a four-finger scanner: each hand's slap kept as one
   * image, by position (13 right, 14 left), as the Android app saves it.
   */
  slaps: Partial<Record<number, SlapImage>>;
  biographicsEnabled: boolean;
  /** DoD transaction (dprs, map, car) when the collection was started from a DoD tile. */
  dodTot?: string;
  /** DoD: scars, marks and tattoos recorded for this collection. */
  smts: SmtEntry[];
  /** DoD: contactless palm prints, at most one per palm position. */
  palms: PalmPrint[];
  /** DoD: the voice sample recorded for this collection (AAC in an .m4a file). */
  voice?: { uri: string; durationMillis: number } | null;
  faceEnabled: boolean;
  fingersEnabled: boolean;
  irisEnabled: boolean;
}

/** A four-finger slap as one image. */
export interface SlapImage {
  /** PNG, base64: shown on screen. */
  png: Base64Image;
  /** WSQ, base64: what the EBTS file carries. */
  wsq: Base64Image;
  width: number;
  height: number;
}

/** A contactless palm print. `position` is the Slapshot palm type (LFP, LWP, RFP, RWP). */
export interface PalmPrint {
  position: string;
  /** PNG, base64: shown on screen. */
  image: Base64Image;
  /** WSQ, base64: what the EBTS file carries. Unset if the export failed. */
  wsq?: Base64Image;
  width: number;
  height: number;
  dpi: number;
}

/** One scar, mark or tattoo: a photo, its category and NCIC code. */
export interface SmtEntry {
  id: string;
  /** JPEG, base64. */
  photo: Base64Image;
  category: string;
  code: string;
  /** SMT code indicator; unset for categories that don't use one. */
  indicator?: string;
  description?: string;
  /** Tattoos only. */
  tattooClass?: string;
  tattooSubClass?: string;
  tattooColors?: string[];
}

export enum AdditionalFGP {
  RIGHT_INDEX_AND_MIDDLE = 16,
  RIGHT_RING_AND_LITTLE = 17,
  LEFT_INDEX_AND_MIDDLE = 18,
  LEFT_RING_AND_LITTLE = 19,
}

export type CaptureSequence = FGP | AdditionalFGP;
