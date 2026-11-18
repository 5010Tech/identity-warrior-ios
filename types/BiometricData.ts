import { OFIQResults } from "@/app/ofiq/OFIQCalculator";

export type Base64Image = string;

export type Compression =
  | "NONE"
  | "WSQ20"
  | "JPEGB"
  | "JPEGL"
  | "JP2"
  | "JP2L"
  | "PNG";

export interface Image {
  referenceId?: string;
  image?: Base64Image;
  imageHeight?: number;
  imageWidth?: number;
  captureDate?: Date;
  compression?: Compression;
  ofiqResults?: OFIQResults;
}

export type Pose = "F" | "L" | "R" | "LA" | "RA";

export interface FaceDTO extends Image {
  pose?: Pose;
  type?: "reference" | "probe";
}

export enum FGP {
  UNKNOWN = 0,
  RIGHT_THUMB = 1,
  RIGHT_INDEX = 2,
  RIGHT_MIDDLE = 3,
  RIGHT_RING = 4,
  RIGHT_LITTLE = 5,
  LEFT_THUMB = 6,
  LEFT_INDEX = 7,
  LEFT_MIDDLE = 8,
  LEFT_RING = 9,
  LEFT_LITTLE = 10,
  PLAIN_RIGHT_THUMB = 11,
  PLAIN_LEFT_THUMB = 12,
  PLAIN_RIGHT_FOUR_FINGERS = 13,
  PLAIN_LEFT_FOUR_FINGERS = 14,
  PLAIN_LEFT_AND_RIGHT_THUMBS = 15,
}

export enum IMP {
  LIVE_SCAN_PLAIN = 0,
  LIVE_SCAN_ROLLED = 1,
  NONLIVE_SCAN_PLAIN = 2,
  NONLIVE_SCAN_ROLLED = 3,
  LATENT_IMPRESSION = 4,
  LATENT_TRACING = 5,
  LATENT_PHOTO = 6,
  LATENT_LIFT = 7,
}

export enum NFIQScore {
  EXCELLENT = 1,
  VERY_GOOD = 2,
  GOOD = 3,
  FAIR = 4,
  POOR = 5,
}

export interface NFIQ {
  fingerPosition: FGP;
  nfiq: NFIQScore;
}

export interface captureDevice {
  make: string;
  model: string;
  serial: string;
}

export interface AmputatedOrBandaged {
  fingerPosition: FGP;
  reason: "XX" | "UP";
}

export type IrisEyePosition = "left" | "right";

export type IrisMissingReason = "UNABLE_TO_CAPTURE";

export interface MissingIris {
  eyePosition: IrisEyePosition;
  reason: IrisMissingReason;
}

export interface MissingIrisDTO {
  eyePosition: number;
  reason: IrisMissingReason;
}

export interface Iris extends Image {
  captureDate: Date;
  eyePosition: IrisEyePosition;
  captureDevice: captureDevice;
  totalScore?: number;
  usableArea?: number;
  horizontalPixelDensity?: number;
  verticalPixelDensity?: number;
  imageBitsPerPixelQuantity?: number;
  missingIrises?: MissingIrisDTO[] | null;
  missingIris?: MissingIris | null;
}

export interface Finger extends Image {
  captureDate: Date;
  fingerPosition: FGP;
  impressionType: number; // IMP
  nfiqs: NFIQ[];
  captureDevice: captureDevice;
  missingFingerprints: AmputatedOrBandaged[] | null;
}
