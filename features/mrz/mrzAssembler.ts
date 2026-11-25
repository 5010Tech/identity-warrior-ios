import {
  fullyValid,
  hasComposite,
  isAcceptable,
  LINE_LENGTH,
  MrzFormat,
  MrzRecord,
  parseMrzLines,
} from "./mrzRecord";

/**
 * From what the camera's text recognition read to a machine-readable zone
 * that passes its own check digits: the counterpart of SmartScanner's
 * MRZAnalyzer and MRZCleaner.
 *
 * Text recognition gets three things wrong in a zone, and each is put right
 * here before the check digits are tried, never after:
 *
 *  - It miscounts a long run of fillers ("<<<<<<<<"). A line of the wrong
 *    length is tried with each of its filler runs stretched or shrunk to fit.
 *  - It confuses look-alikes (O and 0, I and 1, S and 5, B and 8, Z and 2).
 *    Where the layout says a position is a digit or a letter, it is read as
 *    one. A document number may hold either, so nothing is guessed there: a
 *    single check digit would let one wrong guess in ten through. The
 *    recognizer's own second and third readings of the line are tried
 *    instead, and failing those the frame is passed over for the next.
 *  - It adds or drops stray marks, which are removed.
 *
 * A zone is accepted only when its check digits hold, and the scan screen
 * waits for the same zone twice (MrzReadTracker), because the name line has
 * no check digit of its own.
 */

/** One line of text as the recognizer read it, with where it was on the image. */
export interface OcrLine {
  text: string;
  /** Other readings of the same line, best first. */
  alternates?: string[];
  /** Left edge and vertical middle, 0 to 1, y growing upward (Vision's own). */
  x: number;
  y: number;
  width: number;
  height: number;
}

const DIGIT_FOR: Record<string, string> = {
  O: "0",
  Q: "0",
  D: "0",
  U: "0",
  I: "1",
  L: "1",
  Z: "2",
  S: "5",
  G: "6",
  B: "8",
};
const LETTER_FOR: Record<string, string> = {
  "0": "O",
  "1": "I",
  "2": "Z",
  "5": "S",
  "8": "B",
};
/** Upper case, marks that stand for a filler made into one, everything else dropped. */
export const cleanOcrText = (text: string): string =>
  text
    .toUpperCase()
    .replace(/«/g, "<<")
    .replace(/[-_=‹〈]/g, "<")
    .replace(/[^A-Z0-9<]/g, "")
    // A lone C, E, K or S deep inside a run of fillers is a misread filler.
    .replace(/<<[CEKS]<</g, "<<<<<")
    .replace(/<<[CEKS]<</g, "<<<<<");

/** A line of ordinary print (a label on the data page), not of a zone. */
const looksLikePrint = (raw: string) => (raw.match(/[a-z]/g) ?? []).length > 2;

/** Text that could be a line of a zone: long enough, with fillers in it. */
const looksLikeZone = (raw: string) => {
  if (looksLikePrint(raw)) return false;
  const text = cleanOcrText(raw);
  return text.length >= 20 && (text.match(/</g) ?? []).length >= 2;
};

/**
 * Where on the frame the zone appears to be: the box around every line that
 * looks like part of one (0 to 1, y upward, as the lines are given). Null
 * when nothing does. For showing the operator what the camera has found.
 */
export const zoneBox = (
  lines: OcrLine[],
): { x: number; y: number; width: number; height: number } | null => {
  const rows = lines.filter((line) => looksLikeZone(line.text));
  if (!rows.length) return null;
  const left = Math.min(...rows.map((row) => row.x));
  const right = Math.max(...rows.map((row) => row.x + row.width));
  const bottom = Math.min(...rows.map((row) => row.y - row.height / 2));
  const top = Math.max(...rows.map((row) => row.y + row.height / 2));
  return { x: left, y: bottom, width: right - left, height: top - bottom };
};

/** Lines that sit side by side on the image are one row; rows run top to bottom. */
const toRows = (lines: OcrLine[]): string[][] => {
  const kept = lines.filter((line) => !looksLikePrint(line.text));
  const sorted = [...kept].sort((a, b) => b.y - a.y);
  const groups: OcrLine[][] = [];
  for (const line of sorted) {
    const row = groups.find(
      (group) =>
        Math.abs(group[0].y - line.y) <=
        Math.max(group[0].height, line.height) * 0.6,
    );
    if (row) row.push(line);
    else groups.push([line]);
  }
  return groups
    .map((group) => {
      const parts = [...group].sort((a, b) => a.x - b.x);
      const best = cleanOcrText(parts.map((part) => part.text).join(""));
      // Other readings only when the row is one piece: they belong to it whole.
      const others =
        parts.length === 1 ? (parts[0].alternates ?? []).map(cleanOcrText) : [];
      return [best, ...others].filter(
        (text, index, all) => text.length >= 20 && all.indexOf(text) === index,
      );
    })
    .filter((row) => row.length > 0);
};

const unique = (values: string[]) => [...new Set(values)];

/**
 * A name line at its full length: whatever follows the trailing fillers is
 * noise, and the fillers themselves make up the length.
 */
const fitNameLine = (text: string, length: number): string[] => {
  const body = text.replace(/(<{3,})[A-Z0-9]{1,2}$/, "$1").replace(/<+$/, "");
  if (body.length > length || body.length < 5) return [];
  return [body.padEnd(length, "<")];
};

/**
 * A data line at its full length. When it is not, each run of fillers in
 * turn takes up the whole difference: the one that was miscounted gives a
 * line whose check digits agree, the others do not.
 */
const fitDataLine = (text: string, length: number): string[] => {
  if (text.length === length) return [text];
  const difference = length - text.length;
  if (Math.abs(difference) > 14) return [];
  const fits: string[] = [];
  const run = /<+/g;
  let match: RegExpExecArray | null;
  while ((match = run.exec(text))) {
    const size = match[0].length + difference;
    if (size < 0) continue;
    fits.push(
      text.slice(0, match.index) +
        "<".repeat(size) +
        text.slice(match.index + match[0].length),
    );
  }
  // Fillers lost altogether just before the closing check digits.
  if (difference > 0) {
    for (const tail of [1, 2]) {
      if (text.length > tail) {
        fits.push(
          text.slice(0, -tail) + "<".repeat(difference) + text.slice(-tail),
        );
      }
    }
    fits.push(text.padEnd(length, "<"));
  } else {
    fits.push(text.slice(0, length));
  }
  return unique(fits);
};

const mapped = (
  line: string,
  from: number,
  to: number,
  map: Record<string, string>,
) =>
  line.slice(0, from) +
  [...line.slice(from, to)].map((char) => map[char] ?? char).join("") +
  line.slice(to);

/** Positions the layout fixes as digits or as letters are read as such. */
const settle = (format: MrzFormat, lines: string[]): string[] => {
  if (format === "TD1") {
    let [l1, l2, l3] = lines;
    l1 = mapped(l1, 2, 5, LETTER_FOR);
    l2 = mapped(l2, 0, 7, DIGIT_FOR);
    l2 = mapped(l2, 8, 15, DIGIT_FOR);
    l2 = mapped(l2, 15, 18, LETTER_FOR);
    l2 = mapped(l2, 29, 30, DIGIT_FOR);
    l3 = mapped(l3, 0, 30, LETTER_FOR);
    if (l1[14] !== "<") l1 = mapped(l1, 14, 15, DIGIT_FOR);
    return [l1, l2, l3];
  }
  const n = LINE_LENGTH[format];
  let [l1, l2] = lines;
  // The classic misread of the filler after the document code.
  if (l1[1] === "K") l1 = l1[0] + "<" + l1.slice(2);
  l1 = mapped(l1, 2, n, LETTER_FOR);
  l2 = mapped(l2, 9, 10, DIGIT_FOR);
  l2 = mapped(l2, 10, 13, LETTER_FOR);
  l2 = mapped(l2, 13, 20, DIGIT_FOR);
  l2 = mapped(l2, 21, 28, DIGIT_FOR);
  if (format === "TD3") {
    if (l2[42] !== "<") l2 = mapped(l2, 42, 43, DIGIT_FOR);
    l2 = mapped(l2, 43, 44, DIGIT_FOR);
  } else if (format === "TD2") {
    l2 = mapped(l2, 35, 36, DIGIT_FOR);
  }
  return [l1, l2];
};

/**
 * The lines as a record, if their check digits allow it. `fitted` lines had
 * their length made up here, so they are held to every check digit: a guess
 * at where the fillers go must not be let through on a partial match.
 */
const tryLines = (
  format: MrzFormat,
  lines: string[],
  fitted: boolean,
): MrzRecord | null => {
  const settled = settle(format, lines);
  const record = parseMrzLines(settled);
  if (!record || record.format !== format) return null;
  if (fullyValid(record)) return record;
  return !fitted && isAcceptable(record) ? record : null;
};

/** Every way of taking one reading from each row. */
const combinations = (rows: string[][]): string[][] =>
  rows.reduce<string[][]>(
    (all, row) => all.flatMap((sofar) => row.map((text) => [...sofar, text])),
    [[]],
  );

const twoLineFormats = (first: string): MrzFormat[] =>
  first[0] === "V" ? ["MRVA", "MRVB"] : ["TD3", "TD2"];

const DOCUMENT_CODE = /^[PVIAC]/;

/**
 * The zone in what one camera frame showed, or null. A zone with every check
 * digit right wins outright; failing that, one that passes SmartScanner's
 * looser rule (see isAcceptable) on lines that needed no fitting.
 */
export const findMrz = (ocr: OcrLine[]): MrzRecord | null => {
  const rows = toRows(ocr);
  let fallback: MrzRecord | null = null;
  const consider = (record: MrzRecord | null): MrzRecord | null => {
    if (!record) return null;
    if (fullyValid(record)) return record;
    fallback = fallback ?? record;
    return null;
  };
  // Two-line zones: passports, TD2 cards, visas.
  for (let i = 0; i + 1 < rows.length; i += 1) {
    for (const [first, second] of combinations([rows[i], rows[i + 1]])) {
      // Print above the zone can leave a character or two in front of it.
      const start = first.search(DOCUMENT_CODE);
      if (start < 0 || start > 2) continue;
      const head = first.slice(start);
      // Nearest length first, so a card is not stretched into a passport.
      const formats = twoLineFormats(head).sort(
        (a, b) =>
          Math.abs(LINE_LENGTH[a] - second.length) -
          Math.abs(LINE_LENGTH[b] - second.length),
      );
      for (const format of formats) {
        const n = LINE_LENGTH[format];
        for (const l1 of fitNameLine(head, n)) {
          for (const l2 of fitDataLine(second, n)) {
            const found = consider(
              tryLines(format, [l1, l2], second.length !== n),
            );
            if (found) return found;
          }
        }
      }
    }
  }
  // Three-line zones: ID cards and residence permits.
  for (let i = 0; i + 2 < rows.length; i += 1) {
    for (const [first, second, third] of combinations([
      rows[i],
      rows[i + 1],
      rows[i + 2],
    ])) {
      const start = first.search(DOCUMENT_CODE);
      if (start < 0 || start > 2) continue;
      const head = first.slice(start);
      for (const l1 of fitDataLine(head, 30)) {
        for (const l2 of fitDataLine(second, 30)) {
          for (const l3 of fitNameLine(third, 30)) {
            const found = consider(
              tryLines(
                "TD1",
                [l1, l2, l3],
                head.length !== 30 || second.length !== 30,
              ),
            );
            if (found) return found;
          }
        }
      }
    }
  }
  return fallback;
};

/**
 * Why a frame with a zone in view was not accepted, for the field log: the
 * lengths of the rows read and, for the nearest reading, which check digits
 * agreed. Shapes and yes/no only, never the text: a zone is personal data.
 */
export const describeAttempt = (ocr: OcrLine[]): string => {
  const rows = toRows(ocr);
  const lengths = `rows [${rows.map((row) => row[0].length).join(" ")}]`;
  let best: MrzRecord | null = null;
  const score = (record: MrzRecord) =>
    Number(record.validDocumentNumber) +
    Number(record.validDateOfBirth) +
    Number(record.validExpirationDate) +
    Number(record.validComposite);
  const note = (format: MrzFormat, lines: string[]) => {
    const record = parseMrzLines(settle(format, lines));
    if (record && (!best || score(record) > score(best))) best = record;
  };
  for (let i = 0; i + 1 < rows.length; i += 1) {
    const [first, second] = [rows[i][0], rows[i + 1][0]];
    const start = first.search(DOCUMENT_CODE);
    if (start < 0 || start > 2) continue;
    for (const format of twoLineFormats(first.slice(start))) {
      const n = LINE_LENGTH[format];
      for (const l1 of fitNameLine(first.slice(start), n)) {
        for (const l2 of fitDataLine(second, n)) note(format, [l1, l2]);
      }
    }
  }
  for (let i = 0; i + 2 < rows.length; i += 1) {
    const start = rows[i][0].search(DOCUMENT_CODE);
    if (start < 0 || start > 2) continue;
    for (const l1 of fitDataLine(rows[i][0].slice(start), 30)) {
      for (const l2 of fitDataLine(rows[i + 1][0], 30)) {
        for (const l3 of fitNameLine(rows[i + 2][0], 30))
          note("TD1", [l1, l2, l3]);
      }
    }
  }
  if (!best) return `${lengths}, no line begins like a zone or fits one`;
  const found: MrzRecord = best;
  const yes = (ok: boolean) => (ok ? "ok" : "wrong");
  return (
    `${lengths}, nearest ${found.format}: number ${yes(found.validDocumentNumber)}, ` +
    `birth ${yes(found.validDateOfBirth)}, expiry ${yes(found.validExpirationDate)}, ` +
    `composite ${yes(found.validComposite)}`
  );
};

/**
 * How many times the camera must read the very same zone before it is used.
 * The check digits cover the numbers and dates but not the names, so even a
 * perfect zone is read twice; one resting on fewer check digits, more often.
 */
export const readsNeeded = (record: MrzRecord): number => {
  if (!hasComposite(record.format)) return 3; // visas: no composite to lean on
  return fullyValid(record) ? 2 : 4;
};

/** Holds a zone back until the camera has read the very same one often enough. */
export class MrzReadTracker {
  private seen = new Map<string, number>();

  /** The record once it has been read often enough (readsNeeded), else null. */
  add(record: MrzRecord): MrzRecord | null {
    const key = record.lines.join("\n");
    const count = (this.seen.get(key) ?? 0) + 1;
    this.seen.set(key, count);
    return count >= readsNeeded(record) ? record : null;
  }

  reset() {
    this.seen.clear();
  }
}
