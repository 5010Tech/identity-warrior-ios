import { MRZData } from "@/types";
import { TextBlock } from "@react-native-ml-kit/text-recognition";

function normalizeMrzNumericField(value: string): string {
  return value
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/Z/g, "2")
    .replace(/S/g, "5")
    .replace(/B/g, "8")
    .replace(/G/g, "6")
    .replace(/</g, "0");
}

function parseYYMMDDToDate(yyMMdd: string): Date {
  if (!/^\d{6}$/.test(yyMMdd)) throw new Error(`Invalid date: ${yyMMdd}`);
  const yy = Number(yyMMdd.slice(0, 2));
  const mm = Number(yyMMdd.slice(2, 4));
  const dd = Number(yyMMdd.slice(4, 6));
  const yyyy = yy >= 50 ? 1900 + yy : 2000 + yy;
  return new Date(yyyy, mm - 1, dd);
}

function normalizeTd3NameField(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z<]/g, "<")
    .replace(/[<CKSEZ]{3,}$/g, (match) => "<".repeat(match.length))
    .replace(/<[CKSEZ]+</g, (match) => "<".repeat(match.length))
    .replace(/([A-Z]{2,})[CKSEZ]{2,}(?=[A-Z]{2,})/g, "$1<<")
    .replace(/<{3,}/g, "<<");
}

function parseTd3Names(line: string) {
  const normalized = normalizeTd3NameField(line);
  const [lastNamePart = "", firstNamePart = ""] = normalized.split("<<", 2);

  return {
    lastName: lastNamePart.replace(/</g, " ").replace(/\s+/g, " ").trim(),
    firstName: firstNamePart.replace(/</g, " ").replace(/\s+/g, " ").trim(),
  };
}

export function parseMRZ(input: string): MRZData {
  // Normalize lines: trim, remove empty, and pad TD3 lines to 44 chars
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let type: "TD1" | "TD2" | "TD3" = "TD3"; // default guess

  if (lines.length === 2) {
    if (lines[0].length >= 43 && lines[1].length >= 43) type = "TD3";
    else if (lines[0].length >= 35 && lines[1].length >= 35) type = "TD2";
  } else if (lines.length === 3) {
    type = "TD1";
  }

  const result: MRZData = {
    type,
    documentType: "",
    issuingCountry: "",
    lastName: "",
    firstName: "",
    documentNumber: "",
    nationality: "",
    dob: undefined,
    sex: "U",
    expirationDate: undefined,
    optionalData: "",
  };

  if (type === "TD3") {
    const l1 = lines[0].padEnd(44, "<");
    const l2 = lines[1].padEnd(44, "<");

    result.documentType = l1.slice(0, 2).replace(/</g, "").trim();
    result.issuingCountry = l1.slice(2, 5).trim();
    const names = parseTd3Names(l1.slice(5));
    result.lastName = names.lastName;
    result.firstName = names.firstName;

    result.documentNumber = l2.slice(0, 9).replace(/</g, "").trim();
    result.nationality = l2.slice(10, 13).trim();
    result.dob = parseYYMMDDToDate(normalizeMrzNumericField(l2.slice(13, 19)));
    const sex = l2.slice(20, 21);
    result.sex =
      sex === "M" || sex === "F" || sex === "X"
        ? (sex as "M" | "F" | "X")
        : "U";
    result.expirationDate = parseYYMMDDToDate(normalizeMrzNumericField(l2.slice(21, 27)));
    result.optionalData = l2.slice(28, 42).replace(/</g, "").trim();
  }

  // TODO: add TD1 / TD2 parsing if needed, same approach

  return result;
}

/**
 * Check if a block of text looks like an MRZ.
 */
function isMRZ(text: string): boolean {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const isValidMRZLine = (line: string) => /^[A-Z0-9<]+$/.test(line);

  // TD3: 2 lines of 44 chars
  if (
    lines.length === 2 &&
    lines[0].length >= 43 &&
    lines[1].length >= 43 &&
    isValidMRZLine(lines[0]) &&
    isValidMRZLine(lines[1])
  ) {
    return true;
  }

  // TD2: 2 lines of 36 chars
  if (
    lines.length === 2 &&
    lines[0].length >= 35 &&
    lines[1].length >= 35 &&
    isValidMRZLine(lines[0]) &&
    isValidMRZLine(lines[1])
  ) {
    return true;
  }

  // TD1: 3 lines of 30 chars
  if (
    lines.length === 3 &&
    lines.every((l) => l.length >= 29 && isValidMRZLine(l))
  ) {
    return true;
  }

  return false;
}

/**
 * Returns the first TextBlock that looks like MRZ, or undefined
 */
export function findMRZBlock(blocks: TextBlock[]): TextBlock | undefined {
  return blocks.find((block) => isMRZ(block.text));
}

/**
 * Returns parsed MRZData from TextBlock array, or undefined if not found
 */
export function parseMRZFromBlocks(blocks: TextBlock[]) {
  const mrzBlock = findMRZBlock(blocks);
  if (!mrzBlock) return undefined;

  try {
    return parseMRZ(mrzBlock.text);
  } catch (err) {
    console.error("Failed to parse MRZ:", err);
    return undefined;
  }
}
