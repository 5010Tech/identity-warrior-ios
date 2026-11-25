import { logEvent } from "@/util/fieldLog";
import { isoDate, mrzDate, MrzRecord, parseMrzText } from "./mrzRecord";

/**
 * Reads a passport's chip with the phone's own NFC, as the Android app does
 * with PhoneNfcPassportReader. The chip only answers a reader that proves it
 * has seen the printed zone: the key is the document number, date of birth
 * and expiry date from the MRZ scan (BAC, or PACE where the chip has it).
 */

/**
 * The NFC passport reader. Loaded when first wanted, not when this file is:
 * the package looks its native half up as it loads, and a build without it
 * must still be able to open the biographics screen.
 */
const reader = () =>
  (
    require("react-native-nfc-passport-reader") as typeof import("react-native-nfc-passport-reader")
  ).default;

/** True on a phone, and a build, that can read NFC tags at all. */
export const chipReaderAvailable = async (): Promise<boolean> => {
  try {
    return await reader().isNfcSupported();
  } catch (error) {
    logEvent("nfc", "the NFC reader is not available", error);
    return false;
  }
};

/** Whether the zone has what the chip's key is made from. */
export const canKeyChip = (record: MrzRecord) =>
  !!record.documentNumber &&
  !!mrzDate(record.dateOfBirth, "birth") &&
  !!mrzDate(record.expirationDate, "expiry");

/**
 * The chip's own copy of the zone (data group 1): the same fields as the
 * printed one with none of the camera's misreads. Throws when the chip could
 * not be read; iOS shows the reason on its own NFC sheet.
 */
export const readChip = async (printed: MrzRecord): Promise<MrzRecord> => {
  const birth = mrzDate(printed.dateOfBirth, "birth");
  const expiry = mrzDate(printed.expirationDate, "expiry");
  if (!birth || !expiry) throw new Error("The zone has no usable dates");
  logEvent("nfc", `chip read starting (${printed.format})`);
  const startedAt = Date.now();
  try {
    const result = await reader().startReading({
      bacKey: {
        // As printed: nine characters, fillers included.
        documentNo: printed.documentNumber.padEnd(9, "<"),
        birthDate: isoDate(birth),
        expiryDate: isoDate(expiry),
      },
      includeImages: false,
    });
    const chip = result.mrz ? parseMrzText(result.mrz) : null;
    logEvent(
      "nfc",
      `chip read in ${Date.now() - startedAt} ms; zone on the chip ${
        chip ? `read (${chip.format})` : "not readable, using its fields"
      }`,
    );
    if (chip) return chip;
    // The chip was read but its zone was not in a shape we know: take the
    // fields it gave, on top of the printed zone.
    return {
      ...printed,
      surname: result.lastName || printed.surname,
      givenNames: result.firstName || printed.givenNames,
      documentNumber: (result.documentNo || printed.documentNumber).replace(
        /</g,
        "",
      ),
      nationality: result.nationality || printed.nationality,
    };
  } catch (error) {
    logEvent(
      "nfc",
      `chip read failed after ${Date.now() - startedAt} ms`,
      error,
    );
    throw error;
  }
};
