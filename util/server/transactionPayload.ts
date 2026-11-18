import { Compression, FaceDTO, Finger, Iris, Transaction } from "@/types";
import { mapIrisEyePositionToCode } from "@/types/util";

const serializeDateTime = (value?: Date | string | null) => {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
};

const serializeDateLike = (value?: Date | string | null) => {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
};

const sanitizeCaptureDevice = (
  captureDevice?: {
    make?: string;
    model?: string;
    serial?: string;
  } | null,
) =>
  captureDevice
    ? {
        make: captureDevice.make ?? "",
        model: captureDevice.model ?? "",
        serial: captureDevice.serial ?? "",
      }
    : undefined;

const defaultCompression = (
  compression: Compression | undefined,
  image: string | undefined,
  fallback: Compression,
): Compression => compression ?? (image ? fallback : "NONE");

const buildApiFace = (face: FaceDTO) => ({
  referenceId: face.referenceId ?? "",
  captureDate: serializeDateTime(face.captureDate),
  pose: face.pose ?? "",
  captureDevice: sanitizeCaptureDevice(
    (face as FaceDTO & { captureDevice?: any }).captureDevice,
  ),
  image: face.image ?? "",
  imageHeight: face.imageHeight ?? 0,
  imageWidth: face.imageWidth ?? 0,
  compression: defaultCompression(face.compression, face.image, "JPEGB"),
  type: face.type ?? "",
});

const buildApiFinger = (finger: Finger) => ({
  referenceId: finger.referenceId ?? "",
  captureDate: serializeDateTime(finger.captureDate),
  fingerPosition: finger.fingerPosition,
  impressionType: finger.impressionType,
  nfiqs: (finger.nfiqs ?? []).map((nfiq) => ({
    fingerPosition: nfiq.fingerPosition,
    nfiq: String(nfiq.nfiq),
  })),
  captureDevice: sanitizeCaptureDevice(finger.captureDevice),
  image: finger.image ?? "",
  imageHeight: finger.imageHeight ?? 0,
  imageWidth: finger.imageWidth ?? 0,
  compression: defaultCompression(finger.compression, finger.image, "WSQ20"),
  missingFingerprints: finger.missingFingerprints ?? [],
});

const buildApiIris = (iris: Iris) => ({
  referenceId: iris.referenceId ?? `IRIS-${iris.eyePosition.toUpperCase()}`,
  captureDate: serializeDateTime(iris.captureDate),
  eyePosition: mapIrisEyePositionToCode(iris.eyePosition),
  captureDevice: sanitizeCaptureDevice(iris.captureDevice),
  image: iris.image ?? "",
  imageHeight: iris.imageHeight ?? 0,
  imageWidth: iris.imageWidth ?? 0,
  horizontalPixelDensity: iris.horizontalPixelDensity ?? 0,
  verticalPixelDensity: iris.verticalPixelDensity ?? 0,
  imageBitsPerPixelQuantity:
    iris.imageBitsPerPixelQuantity ?? (iris.image ? 8 : 0),
  compression: defaultCompression(iris.compression, iris.image, "PNG"),
  missingIrises: iris.missingIrises?.length
    ? iris.missingIrises
    : iris.missingIris
      ? [
          {
            eyePosition: mapIrisEyePositionToCode(iris.missingIris.eyePosition),
            reason: iris.missingIris.reason,
          },
        ]
      : [],
});

export const buildApiTransaction = (transaction: Transaction) => {
  const { biographicData } = transaction;

  return {
    tot: transaction.tot,
    transactionDate: serializeDateTime(transaction.transactionDate),
    ori: transaction.ori ?? "",
    oan: transaction.oan ?? "",
    dai: transaction.dai ?? "",
    dan: transaction.dan ?? "",
    cai: transaction.cai ?? "",
    on: transaction.on ?? "",
    ou: transaction.ou ?? "",
    osu: transaction.osu ?? "",
    activitySiteId: transaction.activitySiteId ?? "",
    activityTerminal: transaction.activityTerminal ?? "",
    activityCategory: transaction.activityCategory ?? "",
    geoLocation: transaction.geoLocation ?? "",
    tcn: transaction.tcn ?? "",
    applicationName: transaction.applicationName ?? "",
    applicationVersion: transaction.applicationVersion ?? "",
    mnu: biographicData?.mnu ?? "",
    mnuType: biographicData?.mnuType ?? "",
    biographicData: biographicData
      ? {
          firstName: biographicData.firstName ?? "",
          middleName: biographicData.middleName ?? "",
          lastName: biographicData.lastName ?? "",
          dob: serializeDateLike(biographicData.dob),
          sex: biographicData.sex ?? "",
          race: biographicData.race ?? "",
          height:
            biographicData.height != null ? String(biographicData.height) : "",
          weight:
            biographicData.weight != null ? String(biographicData.weight) : "",
          citizenship: biographicData.citizenship ?? "",
          birthCountry: biographicData.birthCountry ?? "",
          eyeColor: biographicData.eyeColor ?? "",
          hairColor: biographicData.hairColor ?? "",
          collectionReason: biographicData.collectionReason ?? "",
          documents: (biographicData.documents ?? []).map((document) => ({
            country: document.country ?? "",
            description: document.description ?? "",
            expirationDate: serializeDateLike(document.expirationDate),
            issueDate: serializeDateLike(document.issueDate),
            type: document.type ?? "",
            identification: document.identification ?? "",
          })),
        }
      : undefined,
    faces: (transaction.faces ?? []).map(buildApiFace),
    fingers: (transaction.fingers ?? []).map(buildApiFinger),
    irises: (transaction.irises ?? []).map(buildApiIris),
  };
};
