import { string } from "zod";

export interface MRZData {
  type: string;
  documentType: string;
  issuingCountry: string;
  lastName: string;
  firstName: string;
  documentNumber: string;
  nationality: string;
  dob?: Date | string; // ISO format yyyy-mm-dd
  sex: "M" | "F" | "X" | "U";
  expirationDate?: Date | string; // ISO format yyyy-mm-dd
  optionalData?: string;
}
