/**
 * Machine-readable zones (ICAO 9303), read strictly: every format the Android
 * app's SmartScanner parser takes (passports, ID cards, visas), with the check
 * digits actually checked. This is the iOS counterpart of
 * smartscanner-mrz-parser. No React Native imports: it runs under plain node,
 * which is how it is tested.
 *
 *   TD3   passports             2 lines of 44
 *   TD2   older ID cards        2 lines of 36
 *   TD1   ID cards, permits     3 lines of 30
 *   MRVA  visas, passport size  2 lines of 44 (no composite check digit)
 *   MRVB  visas, card size      2 lines of 36 (no composite check digit)
 */

export type MrzFormat = "TD1" | "TD2" | "TD3" | "MRVA" | "MRVB";

export interface MrzRecord {
  format: MrzFormat;
  /** Document code as printed, fillers removed: P, PD, ID, I, AC, V... */
  documentCode: string;
  issuingCountry: string;
  nationality: string;
  surname: string;
  givenNames: string;
  /** Fillers removed. Longer than nine characters on some TD1 cards. */
  documentNumber: string;
  /** YYMMDD, as printed. Unknown parts stay as fillers. */
  dateOfBirth: string;
  sex: "M" | "F" | "X" | "U";
  /** YYMMDD, as printed. */
  expirationDate: string;
  /** Personal number or other optional data, fillers removed. */
  optional: string;
  /** TD1 only: the second optional field. */
  optional2: string;
  validDocumentNumber: boolean;
  validDateOfBirth: boolean;
  validExpirationDate: boolean;
  /** Always true for visas, which have no composite check digit. */
  validComposite: boolean;
  /** The zone itself, each line at its full length. */
  lines: string[];
}

export const LINE_LENGTH: Record<MrzFormat, number> = {
  TD1: 30,
  TD2: 36,
  TD3: 44,
  MRVA: 44,
  MRVB: 36,
};

const charValue = (char: string): number => {
  if (char >= "0" && char <= "9") return char.charCodeAt(0) - 48;
  if (char >= "A" && char <= "Z") return char.charCodeAt(0) - 55;
  return 0; // the filler
};

/** The ICAO check digit of a field: weights 7, 3, 1 repeating, modulo 10. */
export const checkDigit = (field: string): string => {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < field.length; i += 1) {
    sum += charValue(field[i]) * weights[i % 3];
  }
  return String(sum % 10);
};

/** A check digit position holding either the digit or, for an empty field, a filler. */
const checks = (field: string, digit: string) =>
  checkDigit(field) === digit ||
  (digit === "<" && field.replace(/</g, "") === "");

const strip = (field: string) => field.replace(/</g, "").trim();

const names = (field: string) => {
  const [surname = "", ...given] = field.split("<<");
  const tidy = (part: string) =>
    part.replace(/</g, " ").replace(/\s+/g, " ").trim();
  return { surname: tidy(surname), givenNames: tidy(given.join(" ")) };
};

const sexOf = (char: string): MrzRecord["sex"] =>
  char === "M" || char === "F" || char === "X" ? char : "U";

const isMrzLine = (line: string) => /^[A-Z0-9<]+$/.test(line);

/** A YYMMDD date that could be a real one. Unknown parts of a birth date are fillers. */
const plausibleDate = (value: string, allowUnknown: boolean) => {
  if (!/^[0-9<]{6}$/.test(value)) return false;
  if (value.includes("<")) {
    return allowUnknown && /^\d{2}(\d{2}|<<)(\d{2}|<<)$/.test(value);
  }
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
};

/** The second line of a passport, a TD2 card or a visa: the same layout up to the expiry date. */
const twoLine = (format: MrzFormat, l1: string, l2: string): MrzRecord => {
  const n = LINE_LENGTH[format];
  const visa = format === "MRVA" || format === "MRVB";
  const optional = l2.slice(28, visa ? n : format === "TD3" ? 42 : 35);
  let validComposite = true;
  if (format === "TD3") {
    validComposite =
      checks(l2.slice(28, 42), l2[42]) &&
      checkDigit(l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43)) ===
        l2[43];
  } else if (format === "TD2") {
    validComposite =
      checkDigit(l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 35)) ===
      l2[35];
  }
  return {
    format,
    documentCode: strip(l1.slice(0, 2)),
    issuingCountry: strip(l1.slice(2, 5)),
    ...names(l1.slice(5)),
    documentNumber: strip(l2.slice(0, 9)),
    nationality: strip(l2.slice(10, 13)),
    dateOfBirth: l2.slice(13, 19),
    sex: sexOf(l2[20]),
    expirationDate: l2.slice(21, 27),
    optional: strip(optional),
    optional2: "",
    validDocumentNumber: checkDigit(l2.slice(0, 9)) === l2[9],
    validDateOfBirth:
      checkDigit(l2.slice(13, 19)) === l2[19] &&
      plausibleDate(l2.slice(13, 19), true),
    validExpirationDate:
      checkDigit(l2.slice(21, 27)) === l2[27] &&
      plausibleDate(l2.slice(21, 27), false),
    validComposite,
    lines: [l1, l2],
  };
};

const td1 = (l1: string, l2: string, l3: string): MrzRecord => {
  // A document number longer than nine characters carries on into the
  // optional field: the check digit position holds a filler, and the number
  // ends with its real check digit just before the next filler.
  let documentNumber = l1.slice(5, 14);
  let validDocumentNumber = checkDigit(documentNumber) === l1[14];
  let optional = l1.slice(15, 30);
  if (l1[14] === "<") {
    const more = optional.split("<")[0];
    if (more.length >= 2) {
      const full = documentNumber + more.slice(0, -1);
      validDocumentNumber = checkDigit(full) === more.slice(-1);
      documentNumber = full;
      optional = optional.slice(more.length);
    }
  }
  return {
    format: "TD1",
    documentCode: strip(l1.slice(0, 2)),
    issuingCountry: strip(l1.slice(2, 5)),
    ...names(l3),
    documentNumber: strip(documentNumber),
    nationality: strip(l2.slice(15, 18)),
    dateOfBirth: l2.slice(0, 6),
    sex: sexOf(l2[7]),
    expirationDate: l2.slice(8, 14),
    optional: strip(optional),
    optional2: strip(l2.slice(18, 29)),
    validDocumentNumber,
    validDateOfBirth:
      checkDigit(l2.slice(0, 6)) === l2[6] &&
      plausibleDate(l2.slice(0, 6), true),
    validExpirationDate:
      checkDigit(l2.slice(8, 14)) === l2[14] &&
      plausibleDate(l2.slice(8, 14), false),
    validComposite:
      checkDigit(
        l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29),
      ) === l2[29],
    lines: [l1, l2, l3],
  };
};

/**
 * Reads a zone whose lines are already at their full length. Null when the
 * lines are not the shape of any format; the check digits are reported in
 * the record, not enforced here (see isAcceptable).
 */
export const parseMrzLines = (lines: string[]): MrzRecord | null => {
  if (!lines.every(isMrzLine)) return null;
  if (lines.length === 3 && lines.every((line) => line.length === 30)) {
    return td1(lines[0], lines[1], lines[2]);
  }
  if (lines.length !== 2 || lines[0].length !== lines[1].length) return null;
  const visa = lines[0][0] === "V";
  if (lines[0].length === 44)
    return twoLine(visa ? "MRVA" : "TD3", lines[0], lines[1]);
  if (lines[0].length === 36)
    return twoLine(visa ? "MRVB" : "TD2", lines[0], lines[1]);
  return null;
};

/**
 * Reads a zone given as text: its lines one per line, or run together as a
 * passport chip stores it (88, 72 or 90 characters).
 */
export const parseMrzText = (text: string): MrzRecord | null => {
  const lines = text
    .toUpperCase()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 1) {
    const all = lines[0];
    if (all.length === 88)
      return parseMrzLines([all.slice(0, 44), all.slice(44)]);
    if (all.length === 72)
      return parseMrzLines([all.slice(0, 36), all.slice(36)]);
    if (all.length === 90) {
      return parseMrzLines([
        all.slice(0, 30),
        all.slice(30, 60),
        all.slice(60),
      ]);
    }
    return null;
  }
  return parseMrzLines(lines);
};

/** Formats with a composite check digit over the whole data line. */
export const hasComposite = (format: MrzFormat) =>
  format === "TD1" || format === "TD2" || format === "TD3";

/** Every check digit the format has is right. */
export const fullyValid = (record: MrzRecord) =>
  record.validDocumentNumber &&
  record.validDateOfBirth &&
  record.validExpirationDate &&
  record.validComposite;

/**
 * Good enough to use, by SmartScanner's rule: the document number and both
 * dates check out, or the composite does.
 */
export const isAcceptable = (record: MrzRecord) =>
  (record.validDocumentNumber &&
    record.validDateOfBirth &&
    record.validExpirationDate) ||
  (hasComposite(record.format) && record.validComposite);

/**
 * A YYMMDD date as a calendar date. A birth date is never in the future, so
 * its century is the latest one that keeps it in the past; an expiry date is
 * in this century unless that would be far ahead.
 */
export const mrzDate = (
  yymmdd: string,
  kind: "birth" | "expiry",
  now: Date = new Date(),
): Date | undefined => {
  if (!/^\d{6}$/.test(yymmdd)) return undefined;
  const yy = Number(yymmdd.slice(0, 2));
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));
  let year = 2000 + yy;
  if (kind === "birth") {
    if (new Date(year, month - 1, day) > now) year -= 100;
  } else if (year > now.getFullYear() + 50) {
    year -= 100;
  }
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 ? date : undefined;
};

/** yyyy-MM-dd, for the chip reader's key. */
export const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
