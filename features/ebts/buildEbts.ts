import { Type1Settings } from "@/types";
import { FaceDTO, Finger, Iris, Pose } from "@/types/BiometricData";
import { PalmPrint, SmtEntry } from "@/features/capture/types";
import { smtImageType } from "@/constants/smt";
import { DOD_DEFAULTS, resolveType1 } from "@/constants/dodDefaults";
import { hasMissingIrisReason } from "@/types/util";
import {
  encodeFile,
  fromBase64,
  NistRecord,
  record,
  setField,
} from "./nist";

/**
 * Builds a DoD EBTS v4.1 file from a collection. This follows the Android
 * app: TransactionManager sets up the Type-1 and Type-2 values, and the
 * record layouts are the "binary" generators in static-biometric-collection
 * (Type1Generator, Type2Generator, Type10Generator, Type14Generator).
 *
 * In so far: Type-1, Type-2, Type-10 (face photos and scar / mark / tattoo
 * photos), Type-14 fingerprints, Type-15 palm prints and Type-17 irises.
 * Type-11 voice sample, and the latent transaction (LFIS) with its Type-13.
 */

export type DodTot = "DPRS" | "MAP" | "CAR";

/** The DoD biographics form (DodBiographicsForm). */
export interface DodBiographics {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fourthName?: string;
  fifthName?: string;
  sex?: string;
  height?: string | number;
  weight?: string | number;
  eyeColor?: string;
  hairColor?: string;
  race?: string;
  dob?: Date | string | null;
  birthCountry?: string;
  citizenship?: string;
  personnelType?: string;
  dnaId?: string;
  dnaSystem?: string;
  collectionReason?: string;
  internment?: string;
  arrestDate?: Date | string | null;
  arrestOffense?: string;
  /**
   * Identity documents scanned on the biographics screen. The file carries
   * the first as its collected identification (2.8019), as on Android.
   */
  documents?: {
    identification?: string;
    cid?: string;
    country?: string;
    issueDate?: Date | string | null;
    expirationDate?: Date | string | null;
  }[];
}

export interface EbtsInput {
  tot: DodTot;
  type1: Partial<Type1Settings>;
  biographics: DodBiographics;
  faces: FaceDTO[];
  fingers: Finger[];
  /** MAP and CAR: the same fingers rolled (impression type 1). */
  rolledFingers?: Finger[];
  /**
   * MAP and CAR on a scanner, as the Android app writes them: a hand's slap
   * as one image (position 13 right, 14 left) in place of its four fingers'
   * own records, and the flat thumbs as plain thumbs (positions 11 and 12).
   */
  slaps?: Partial<Record<number, { wsq: string; width: number; height: number }>>;
  plainThumbs?: boolean;
  irises?: Iris[];
  smts?: SmtEntry[];
  palms?: PalmPrint[];
  /** The voice sample: the recording file's bytes (base64) and its length. */
  voice?: { base64: string; seconds: number } | null;
  /** App version, for the application profile (1.016). */
  appVersion?: string;
  now?: Date;
}

export interface EbtsFile {
  tcn: string;
  bytes: Uint8Array;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** YYYYMMDD in GMT, as the Android app's transaction calendar is. */
const ymd = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;

const ymdhms = (d: Date) =>
  `${ymd(d)}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;

/** A date picked on a form: the calendar day the operator chose. */
const formDate = (value?: Date | string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
};

const text = (value?: string | number | null) =>
  value == null ? "" : String(value).trim();

/** TransactionManager.createTcn: ORI-yyyyMMddhhmmss-IWAR-0100-nnnnn. */
const createTcn = (ori: string, now: Date) => {
  // The Android format uses a 12-hour clock ("hh"); kept the same here.
  const hour12 = now.getUTCHours() % 12 || 12;
  const stamp = `${ymd(now)}${pad(hour12)}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  const random = 10000 + Math.floor(Math.random() * 20000);
  return `${ori}-${stamp}-IWAR-0100-${random}`;
};

const type1Record = (
  { tot, type1, appVersion }: EbtsInput,
  tcn: string,
  now: Date,
): NistRecord => {
  const rec = record(1);
  setField(rec, 2, "0502"); // VER: ANSI/NIST-ITL 1-2011 update 2015
  setField(rec, 4, tot);
  setField(rec, 5, ymd(now));
  setField(rec, 7, text(type1.dai));
  setField(rec, 8, text(type1.ori));
  setField(rec, 9, tcn);
  setField(rec, 11, "19.69"); // native scanning resolution (500 ppi)
  setField(rec, 12, "19.69"); // nominal transmitting resolution
  // DOM: the domain name BioCore checks for, exactly as DoD EBTS 4.1 gives
  // it (the Android app writes "EBTS", which BioCore reads as unknown).
  setField(rec, 13, ["DoD EBTS", "4.1"]);
  setField(rec, 14, `${ymdhms(now)}Z`);
  setField(rec, 15, ["3", "UTF-8", "000"]);
  setField(rec, 16, [
    "5010 Tech, LLC",
    "Identity Warrior",
    appVersion ?? "1.0",
  ]);
  if (text(type1.dan) || text(type1.oan)) {
    setField(rec, 17, [text(type1.dan), text(type1.oan)]);
  }
  return rec;
};

const type2Record = (
  { tot, biographics: bio, fingers, irises = [], smts = [] }: EbtsInput,
): NistRecord => {
  const rec = record(2);
  // IDC 00: the image records then run 01, 02, ... so the file's IDCs are
  // contiguous from zero, as BioCore's writer expects. (Android writes 99.)
  setField(rec, 2, "00");
  // Retention code, from the built-in default (retention.code on Android).
  setField(rec, 5, DOD_DEFAULTS.retention ? "Y" : "N");
  setField(rec, 24, text(bio.sex));
  // Scars, marks and tattoos: the NCIC code of each one photographed.
  setField(
    rec,
    26,
    smts.filter((smt) => text(smt.code)).map((smt) => [text(smt.code)]),
  );
  setField(rec, 32, text(bio.hairColor));
  if (tot === "CAR") {
    setField(rec, 45, formDate(bio.arrestDate));
    if (text(bio.arrestOffense)) {
      setField(rec, 47, [["", text(bio.arrestOffense)]]);
    }
  }
  setField(rec, 73, [[DOD_DEFAULTS.controllingAgencyId]]); // controlling agency
  // Fingers that could not be printed: position and reason (XX / UP).
  const missing = fingers.flatMap((finger) =>
    (finger.missingFingerprints ?? []).map((m) => [
      pad(Number(m.fingerPosition)),
      m.reason,
    ]),
  );
  setField(rec, 84, missing);
  if (tot === "DPRS" || tot === "CAR") {
    setField(rec, 302, text(bio.internment));
  }
  if (text(bio.personnelType)) {
    setField(rec, 310, [text(bio.personnelType), "", "", "", ""]);
  }
  if (formDate(bio.dob)) setField(rec, 8003, [formDate(bio.dob), "", ""]);
  if (text(bio.citizenship)) setField(rec, 8007, [[text(bio.citizenship)]]);
  if (text(bio.race)) setField(rec, 8008, [[text(bio.race)]]);
  if (text(bio.birthCountry)) {
    setField(rec, 8033, ["", "", text(bio.birthCountry), "", ""]);
  }
  // Collected identification, in the Android generator's order: number,
  // kind (PASS, DLN), issuer, issued, expires, issuing office, comment.
  const document = (bio.documents ?? []).find(
    (doc) => text(doc.identification) && text(doc.cid),
  );
  if (document) {
    setField(rec, 8019, [
      [
        text(document.identification),
        text(document.cid),
        text(document.country),
        formDate(document.issueDate),
        formDate(document.expirationDate),
        "",
        "",
      ],
    ]);
  }
  if (text(bio.height)) {
    const inches = Number(bio.height);
    setField(rec, 8035, [[inches === 0 ? "000" : text(bio.height), "IN", "EST"]]);
  }
  if (text(bio.weight)) {
    const pounds = Number(bio.weight);
    setField(rec, 8036, [[pounds === 0 ? "00" : text(bio.weight), "LB", "EST"]]);
  }
  if (text(bio.eyeColor)) {
    setField(rec, 8037, [
      ["1", text(bio.eyeColor)],
      ["2", text(bio.eyeColor)],
    ]);
  }
  setField(rec, 8040, [
    text(bio.firstName),
    text(bio.middleName),
    text(bio.lastName),
    text(bio.fourthName),
    text(bio.fifthName),
    "",
    "",
  ]);
  // COL_RSN is mandatory in the Type-2: written for every transaction that
  // collects a reason (CAR records the arrest offence instead).
  if (tot !== "CAR") setField(rec, 8103, text(bio.collectionReason));
  // Irises that were not captured: R (right) / L (left), as on Android.
  setField(
    rec,
    8110,
    irises
      .filter((iris) => hasMissingIrisReason(iris))
      .map((iris) => [iris.eyePosition === "right" ? "R" : "L"]),
  );
  if (text(bio.dnaId)) {
    setField(rec, 8606, [text(bio.dnaSystem), text(bio.dnaId)]);
  }
  return rec;
};

/** Subject pose (10.020), with the angle (10.021) for the angled poses. */
const POSE: Record<Pose, { pos: string; poa?: string }> = {
  F: { pos: "F" },
  L: { pos: "L" },
  R: { pos: "R" },
  LA: { pos: "A", poa: "-45" },
  RA: { pos: "A", poa: "45" },
};

const type10Record = (
  face: FaceDTO,
  idc: number,
  ori: string,
  now: Date,
): NistRecord => {
  const rec = record(10);
  setField(rec, 2, pad(idc));
  setField(rec, 3, "FACE");
  setField(rec, 4, ori);
  setField(rec, 5, ymd(face.captureDate ? new Date(face.captureDate) : now));
  setField(rec, 6, String(face.imageWidth ?? 0));
  setField(rec, 7, String(face.imageHeight ?? 0));
  setField(rec, 8, "2"); // scale units, as on Android
  setField(rec, 9, "60");
  setField(rec, 10, "60");
  setField(rec, 11, "JPEGB");
  setField(rec, 12, "SRGB");
  setField(rec, 13, "52"); // subject acquisition profile
  const pose = POSE[face.pose ?? "F"];
  setField(rec, 20, pose.pos);
  setField(rec, 21, pose.poa);
  rec.data = fromBase64(face.image ?? "");
  return rec;
};

const type14Record = (
  finger: Finger,
  idc: number,
  ori: string,
  now: Date,
  /** The record's position when it is not the finger's own (11, 12). */
  positionAs?: number,
): NistRecord => {
  const rec = record(14);
  const position = positionAs ?? Number(finger.fingerPosition);
  setField(rec, 2, pad(idc));
  setField(rec, 3, String(finger.impressionType ?? 0));
  setField(rec, 4, ori);
  setField(rec, 5, ymd(finger.captureDate ? new Date(finger.captureDate) : now));
  setField(rec, 6, String(finger.imageWidth ?? 0));
  setField(rec, 7, String(finger.imageHeight ?? 0));
  setField(rec, 8, "1"); // pixels per inch
  setField(rec, 9, "500");
  setField(rec, 10, "500");
  setField(rec, 11, "WSQ20");
  setField(rec, 12, "8");
  setField(rec, 13, String(position));
  const quality = (finger.nfiqs ?? [])
    .filter((n) => n.nfiq != null)
    .map((n) => [String(Number(n.fingerPosition)), String(n.nfiq)]);
  setField(rec, 22, quality);
  // Make, model and serial number: all three are mandatory once the field
  // is there. The phone's camera gives none of its own, so its prints carry
  // what the Android app writes for them (Sciometrics, Slapshot), and a
  // device with no serial number says so, as on Android.
  const device = finger.captureDevice;
  const make = text(device?.make);
  const model = text(device?.model);
  const serial = text(device?.serial);
  if (make || model || serial) {
    const camera = make === "Slapshot" && !model;
    setField(rec, 904, [
      camera ? "Sciometrics" : make || model,
      camera ? "Slapshot" : model || make,
      serial || "No Serial",
    ]);
  }
  rec.data = fromBase64(finger.image ?? "");
  return rec;
};

/** Width and height read from a JPEG or PNG header; zeros if unreadable. */
const imageSize = (bytes: Uint8Array): { width: number; height: number } => {
  const be16 = (at: number) => (bytes[at] << 8) | bytes[at + 1];
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    // PNG: the IHDR chunk follows the 8-byte signature.
    return {
      width: be16(16) * 65536 + be16(18),
      height: be16(20) * 65536 + be16(22),
    };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let at = 2;
    while (at + 9 < bytes.length) {
      if (bytes[at] !== 0xff) {
        at += 1;
        continue;
      }
      const marker = bytes[at + 1];
      // Start-of-frame markers carry the size (C4, C8 and CC are not frames).
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return { width: be16(at + 7), height: be16(at + 5) };
      }
      at += 2 + be16(at + 2);
    }
  }
  return { width: 0, height: 0 };
};

const isPng = (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50;

/** A scar, mark or tattoo photo: a Type-10 annotated with what it shows. */
const smtRecord = (
  smt: SmtEntry,
  idc: number,
  ori: string,
  now: Date,
): NistRecord => {
  const rec = record(10);
  const data = fromBase64(smt.photo ?? "");
  const { width, height } = imageSize(data);
  const imageType = smtImageType(smt.category);
  setField(rec, 2, pad(idc));
  setField(rec, 3, imageType); // SCAR, MARK or TATTOO
  setField(rec, 4, ori);
  setField(rec, 5, ymd(now));
  setField(rec, 6, String(width));
  setField(rec, 7, String(height));
  setField(rec, 8, "2");
  setField(rec, 9, "60");
  setField(rec, 10, "60");
  setField(rec, 11, isPng(data) ? "PNG" : "JPEGB");
  setField(rec, 12, "SRGB");
  setField(rec, 40, text(smt.code) ? [[text(smt.code)]] : undefined); // NCIC code
  // Descriptor: indicator, tattoo class, subclass, free-text description.
  setField(rec, 42, [
    [
      text(smt.indicator) || imageType,
      text(smt.tattooClass),
      text(smt.tattooSubClass),
      text(smt.description),
    ],
  ]);
  const colors = (smt.tattooColors ?? []).map(text).filter(Boolean);
  setField(rec, 43, colors.length ? [colors] : undefined);
  rec.data = data;
  return rec;
};

/** Palm position codes (15.013) for the contactless palm types. */
const PALM_POSITION: Record<string, string> = {
  RFP: "21", // right full palm
  RWP: "22", // right writer's palm
  LFP: "23", // left full palm
  LWP: "24", // left writer's palm
};

const type15Record = (
  palm: PalmPrint,
  idc: number,
  ori: string,
  now: Date,
): NistRecord => {
  const rec = record(15);
  // WSQ when the capture produced one (as on Android); otherwise the PNG.
  const data = fromBase64(palm.wsq || palm.image || "");
  const dpi = String(palm.dpi || 500);
  setField(rec, 2, pad(idc));
  setField(rec, 3, "10"); // impression type, as on Android
  setField(rec, 4, ori);
  setField(rec, 5, ymd(now));
  setField(rec, 6, String(palm.width || imageSize(data).width));
  setField(rec, 7, String(palm.height || imageSize(data).height));
  setField(rec, 8, "1"); // pixels per inch
  setField(rec, 9, dpi);
  setField(rec, 10, dpi);
  setField(rec, 11, isPng(data) ? "PNG" : "WSQ20");
  setField(rec, 12, "8");
  setField(rec, 13, PALM_POSITION[palm.position] ?? "20");
  setField(rec, 30, "ASSISTED");
  rec.data = data;
  return rec;
};

const type17Record = (
  iris: Iris,
  idc: number,
  ori: string,
  now: Date,
): NistRecord => {
  const rec = record(17);
  const data = fromBase64(iris.image ?? "");
  const size = imageSize(data);
  setField(rec, 2, pad(idc));
  setField(rec, 3, iris.eyePosition === "right" ? "1" : "2");
  setField(rec, 4, ori);
  setField(rec, 5, ymd(iris.captureDate ? new Date(iris.captureDate) : now));
  setField(rec, 6, String(iris.imageWidth || size.width));
  setField(rec, 7, String(iris.imageHeight || size.height));
  setField(rec, 8, "0"); // no scale given
  setField(rec, 9, "1");
  setField(rec, 10, "1");
  setField(rec, 11, isPng(data) ? "PNG" : "JPEGB");
  setField(rec, 12, String(iris.imageBitsPerPixelQuantity || 8));
  setField(rec, 13, "GRAY");
  const device = iris.captureDevice;
  if (device?.make || device?.model || device?.serial) {
    setField(rec, 19, [
      text(device.make),
      text(device.model),
      text(device.serial),
    ]);
  }
  rec.data = data;
  return rec;
};

/** The voice sample (Type-11), set up as TransactionManager does on Android. */
const type11Record = (
  voice: { base64: string; seconds: number },
  idc: number,
  ori: string,
  now: Date,
): NistRecord => {
  const rec = record(11);
  const data = fromBase64(voice.base64);
  const seconds = String(Math.max(1, Math.round(voice.seconds)));
  setField(rec, 2, pad(idc));
  setField(rec, 3, "0"); // audio object: the recording is in this record
  setField(rec, 4, ori);
  setField(rec, 6, ["Q", "S", ""]); // questioned voice, single speaker
  setField(rec, 7, ["", "Apple", "iPhone", ""]);
  setField(
    rec,
    9,
    `${ymd(now)}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`,
  );
  // Recording length in seconds, size in bytes, sample count (1 on Android).
  setField(rec, 11, [seconds, String(data.length), "1"]);
  rec.data = data;
  return rec;
};

export const buildEbts = (input: EbtsInput): EbtsFile => {
  const now = input.now ?? new Date();
  // Blank Type-1 settings fall back to the built-in defaults, so the mandatory
  // agency fields are never missing.
  input = { ...input, type1: resolveType1(input.type1) };
  // The source agency of every image record (x.004) is the ORI: on Android,
  // saving Type-1 settings sets the source agency to the originating agency.
  const ori = text(input.type1.ori);
  const tcn = createTcn(ori, now);
  const records: NistRecord[] = [
    type1Record(input, tcn, now),
    type2Record(input),
  ];
  // Image records are numbered from 1, faces first, as on Android. A finger
  // that was omitted has no record: it is listed in the Type-2 (2.084).
  let idc = 1;
  input.faces
    .filter((face) => !!face.image)
    .forEach((face) => records.push(type10Record(face, idc++, ori, now)));
  (input.smts ?? [])
    .filter((smt) => !!smt.photo)
    .forEach((smt) => records.push(smtRecord(smt, idc++, ori, now)));
  // Android's order after the photos: voice, irises, fingerprints, palms.
  if (input.voice?.base64) {
    records.push(type11Record(input.voice, idc++, ori, now));
  }
  (input.irises ?? [])
    .filter((iris) => !!iris.image && !hasMissingIrisReason(iris))
    .forEach((iris) => records.push(type17Record(iris, idc++, ori, now)));
  const flats = input.fingers.filter(
    (finger) => !!finger.image && !finger.missingFingerprints?.length,
  );
  // A hand's slap kept whole stands in for its four fingers' own records,
  // and carries each of those fingers' quality scores.
  const SLAP_FINGERS: Record<number, number[]> = {
    13: [2, 3, 4, 5],
    14: [7, 8, 9, 10],
  };
  const inSlap = new Set<number>();
  Object.entries(input.slaps ?? {}).forEach(([code, slap]) => {
    const members = flats.filter((finger) =>
      SLAP_FINGERS[Number(code)]?.includes(Number(finger.fingerPosition)),
    );
    if (!slap?.wsq || !members.length) return;
    members.forEach((finger) => inSlap.add(Number(finger.fingerPosition)));
    records.push(
      type14Record(
        {
          ...members[0],
          fingerPosition: Number(code) as Finger["fingerPosition"],
          image: slap.wsq,
          imageWidth: slap.width,
          imageHeight: slap.height,
          nfiqs: members.flatMap((finger) => finger.nfiqs ?? []),
        },
        idc++,
        ori,
        now,
      ),
    );
  });
  const PLAIN_THUMB: Record<number, number> = { 1: 11, 6: 12 };
  flats
    .filter((finger) => !inSlap.has(Number(finger.fingerPosition)))
    .forEach((finger) =>
      records.push(
        type14Record(
          finger,
          idc++,
          ori,
          now,
          input.plainThumbs
            ? PLAIN_THUMB[Number(finger.fingerPosition)]
            : undefined,
        ),
      ),
    );
  // Rolled prints follow the flat ones, each its own Type-14.
  (input.rolledFingers ?? [])
    .filter((finger) => !!finger.image && !finger.missingFingerprints?.length)
    .forEach((finger) => records.push(type14Record(finger, idc++, ori, now)));
  (input.palms ?? [])
    .filter((palm) => !!palm.image)
    .forEach((palm) => records.push(type15Record(palm, idc++, ori, now)));
  return { tcn, bytes: encodeFile(records) };
};

/** What the latent transaction form collects (Android's LatentTransaction). */
export interface LatentEbtsInput {
  type1: Partial<Type1Settings>;
  /** The scaled latent print, a PNG, with the resolution it was scaled to. */
  print: { pngBase64: string; dpi: number; width?: number; height?: number };
  impressionType: string;
  position: string;
  comment?: string;
  attentionIndicator: string;
  caseIdPrefix: string;
  caseId: string;
  extension: string;
  appVersion?: string;
  now?: Date;
}

/** Bits per pixel from a PNG header (bit depth times channels); 8 if unreadable. */
const pngBitsPerPixel = (bytes: Uint8Array) => {
  if (!isPng(bytes) || bytes.length < 26) return 8;
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[bytes[25]] ?? 1;
  return (bytes[24] || 8) * channels;
};

/**
 * A latent friction ridge image search (LFIS): Type-1, a Type-2 with the case
 * details and no person, and the print as a Type-13.
 */
export const buildLatentEbts = (input: LatentEbtsInput): EbtsFile => {
  const now = input.now ?? new Date();
  const type1 = resolveType1(input.type1);
  const ori = text(type1.ori);
  const tcn = createTcn(ori, now);

  const t1 = type1Record(
    {
      tot: "LFIS" as DodTot,
      type1,
      appVersion: input.appVersion,
    } as EbtsInput,
    tcn,
    now,
  );
  // No scanning resolution on a latent transaction, as on Android.
  setField(t1, 11, "00.00");
  setField(t1, 12, "00.00");

  const t2 = record(2);
  setField(t2, 2, "00");
  setField(t2, 6, text(input.attentionIndicator));
  setField(t2, 10, [[text(input.caseIdPrefix), text(input.caseId)]]);
  const extension = text(input.extension);
  setField(t2, 11, [[extension === "0" ? "0000" : extension]]);
  setField(t2, 73, [[DOD_DEFAULTS.controllingAgencyId]]);

  const data = fromBase64(input.print.pngBase64);
  const size = imageSize(data);
  const dpi = String(input.print.dpi || 500);
  const t13 = record(13);
  setField(t13, 2, "01");
  setField(t13, 3, text(input.impressionType));
  setField(t13, 4, ori);
  setField(t13, 5, ymd(now));
  setField(t13, 6, String(size.width || input.print.width || 0));
  setField(t13, 7, String(size.height || input.print.height || 0));
  setField(t13, 8, "1"); // pixels per inch
  setField(t13, 9, dpi);
  setField(t13, 10, dpi);
  setField(t13, 11, "PNG");
  setField(t13, 12, String(pngBitsPerPixel(data)));
  setField(t13, 13, text(input.position));
  setField(t13, 20, text(input.comment));
  setField(t13, 904, ["Sciometrics", "Digital Lift", "No Serial"]); // as on Android
  t13.data = data;

  return { tcn, bytes: encodeFile([t1, t2, t13]) };
};
