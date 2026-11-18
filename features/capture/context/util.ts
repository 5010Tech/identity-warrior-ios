import {
  AmputatedOrBandaged,
  Base64Image,
  FGP,
  Finger,
  fingerprintCaptureSequence,
  Iris,
  IrisEyePosition,
  IrisMissingReason,
  NFIQScore,
} from "@/types";
import { IMP } from "@/types/BiometricData";
import { mapIrisEyePositionToCode, mapToFingerType } from "@/types/util";

export const UPDATE_BIOGRAPHIC_VALUE = "UPDATE_BIOGRAPHIC_VALUE";

interface MapFingerInput {
  image?: Base64Image;
  imageHeight?: number;
  imageWidth?: number;
  i: number;
  nfiq?: NFIQScore;
  fgp: FGP;
  modelNumber: string;
  serialNumber: string;
  make: string;
  missingFingerprintsReason?: AmputatedOrBandaged["reason"];
  fingerprintCaptureSequence?: fingerprintCaptureSequence;
}

interface MapIrisInput {
  image?: Base64Image;
  imageHeight?: number;
  imageWidth?: number;
  eyePosition: IrisEyePosition;
  totalScore?: number;
  usableArea?: number;
  modelNumber: string;
  serialNumber: string;
  make: string;
  missingReason?: IrisMissingReason;
  horizontalPixelDensity?: number;
  verticalPixelDensity?: number;
  imageBitsPerPixelQuantity?: number;
}
export const mapFinger = ({
  i,
  nfiq,
  fgp,
  make,
  modelNumber,
  serialNumber,
  missingFingerprintsReason,
  image,
  imageHeight,
  imageWidth,
  fingerprintCaptureSequence,
}: MapFingerInput): Finger => ({
  image,
  imageHeight,
  imageWidth,
  referenceId: `FP-${mapToFingerType(fgp)}-${i}`,
  captureDate: new Date(),
  fingerPosition: fgp,
  impressionType:
    fingerprintCaptureSequence === "tenRolled"
      ? IMP.LIVE_SCAN_ROLLED
      : IMP.LIVE_SCAN_PLAIN,
  nfiqs: nfiq
    ? [
        {
          fingerPosition: fgp,
          nfiq,
        },
      ]
    : [],
  captureDevice: {
    make,
    model: modelNumber,
    serial: serialNumber,
  },
  missingFingerprints: missingFingerprintsReason
    ? [{ fingerPosition: fgp, reason: missingFingerprintsReason }]
    : null,
});

export const mapIris = ({
  eyePosition,
  totalScore,
  usableArea,
  make,
  modelNumber,
  serialNumber,
  missingReason,
  image,
  imageHeight,
  imageWidth,
  horizontalPixelDensity,
  verticalPixelDensity,
  imageBitsPerPixelQuantity,
}: MapIrisInput): Iris => ({
  image,
  imageHeight,
  imageWidth,
  referenceId: `IRIS-${eyePosition.toUpperCase()}`,
  captureDate: new Date(),
  eyePosition,
  captureDevice: {
    make,
    model: modelNumber,
    serial: serialNumber,
  },
  compression: image ? "PNG" : "NONE",
  totalScore,
  usableArea,
  horizontalPixelDensity,
  verticalPixelDensity,
  imageBitsPerPixelQuantity,
  missingIrises: missingReason
    ? [
        {
          eyePosition: mapIrisEyePositionToCode(eyePosition),
          reason: missingReason,
        },
      ]
    : [],
  missingIris: missingReason
    ? {
        eyePosition,
        reason: missingReason,
      }
    : null,
});
