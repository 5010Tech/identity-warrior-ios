import { FingerType } from "@/modules/slapshot-capture-library/src";
import { Base64Image, FGP } from "@/types";
import { Transaction } from "@/types/Transaction";

export interface CaptureState {
  fetching: string[];
  error?: any;
  transaction: Transaction;
  biographicsComplete?: boolean;
  pngFingers: Record<FingerType, Base64Image>;
  biographicsEnabled: boolean;
  faceEnabled: boolean;
  fingersEnabled: boolean;
  irisEnabled: boolean;
}

export enum AdditionalFGP {
  RIGHT_INDEX_AND_MIDDLE = 16,
  RIGHT_RING_AND_LITTLE = 17,
  LEFT_INDEX_AND_MIDDLE = 18,
  LEFT_RING_AND_LITTLE = 19,
}

export type CaptureSequence = FGP | AdditionalFGP;
