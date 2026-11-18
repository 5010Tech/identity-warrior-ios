// dlParser.ts
import { DLData } from "@/types";

/**
 * Parse an AAMVA-compliant PDF417 driver's license string
 * @param raw Raw PDF417 string
 */
export function parseDL(raw: string): DLData {
  const data: DLData = {};

  const fieldMap: Record<string, keyof DLData> = {
    DCS: "lastName",
    DAC: "firstName",
    DAD: "middleName",
    DCT: "firstName", // alternate first name field
    DBB: "dob", // Date of Birth
    DBA: "expirationDate", // Expiration Date
    DBD: "issueDate", // Issue Date
    DBC: "sex", // Sex
    DAQ: "licenseNumber", // License Number
    DAG: "addressStreet", // Street Address
    DAI: "city", // City
    DAJ: "state", // State
    DAK: "postalCode", // ZIP
    DCG: "country", // Country
    DAU: "height",
    DAY: "eyeColor",
    DAZ: "hairColor",
  };

  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const code = line.substring(0, 3);
    var value = line.substring(3).trim();
    //Deal with non-standard jurisdicational variants of color
    if ((code == "DAZ" || code == "DAY") && value == "BRN") {
      value = "BRO";
    }
    if (fieldMap[code]) {
      (data as any)[fieldMap[code]] = value;
    }
  }

  // Helper: parse MMDDYYYY into a local Date
  const parseLocalDate = (val?: string): Date | undefined => {
    if (!val || !/^\d{8}$/.test(val)) return undefined;
    const month = Number(val.slice(0, 2));
    const day = Number(val.slice(2, 4));
    const year = Number(val.slice(4, 8));
    return new Date(year, month - 1, day); // monthIndex is 0-based
  };

  data.dob = parseLocalDate(data.dob as unknown as string);
  data.expirationDate = parseLocalDate(
    data.expirationDate as unknown as string,
  );
  data.issueDate = parseLocalDate(data.issueDate as unknown as string);

  if (data.sex) {
    const sexStr = String(data.sex);
    if (sexStr === "1") data.sex = "M";
    else if (sexStr === "2") data.sex = "F";
    else data.sex = "U";
  }

  const formatPostalCode = (val?: string): string | undefined => {
    if (!val) return undefined;
    const digits = val.replace(/\D/g, ""); // strip non-digits
    if (digits.length === 9) {
      return `${digits.substring(0, 5)}-${digits.substring(5)}`;
    }
    if (digits.length === 5) {
      return digits; // pad with -0000 if no extension
    }
    return val; // fallback if unexpected format
  };

  data.postalCode = formatPostalCode(data.postalCode);

  const parseHeightToInches = (
    heightStr: string | undefined,
  ): string | undefined => {
    if (!heightStr) return undefined;

    const match = heightStr.match(/(\d+)\s*(in|cm)?/i);
    if (!match) return undefined;

    let value = parseInt(match[1], 10);
    const unit = (match[2] || "in").toLowerCase();

    if (unit === "cm") {
      value = Math.round(value / 2.54); // convert cm → inches
    }

    return isNaN(value) ? undefined : `${value}`;
  };

  if (data.height) {
    data.height = parseHeightToInches(data.height);
  }

  return data;
}
