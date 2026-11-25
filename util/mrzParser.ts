import { MRZData } from "@/types";
import { mrzDate, MrzRecord, parseMrzText } from "@/features/mrz/mrzRecord";

/** A zone as the biographics form takes it. */
export const toMrzData = (record: MrzRecord): MRZData => ({
  type: record.format,
  documentType: record.documentCode,
  issuingCountry: record.issuingCountry,
  lastName: record.surname,
  firstName: record.givenNames,
  documentNumber: record.documentNumber,
  nationality: record.nationality,
  dob: mrzDate(record.dateOfBirth, "birth"),
  sex: record.sex,
  expirationDate: mrzDate(record.expirationDate, "expiry"),
  optionalData: record.optional,
});

/**
 * Reads a machine-readable zone given as text (see features/mrz for the
 * formats and the check digits). Throws when the text is not a zone.
 */
export function parseMRZ(input: string): MRZData {
  const record = parseMrzText(input);
  if (!record) throw new Error("Not a machine-readable zone");
  return toMrzData(record);
}
