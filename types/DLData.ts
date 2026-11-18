import {
  CountryCode,
  EyeColorCode,
  HairColorCode,
  SexCode,
} from "./BiographicData";

export interface DLData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  licenseNumber?: string;
  expirationDate?: Date;
  issueDate?: Date;
  dob?: Date;
  sex?: SexCode;
  addressStreet?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: CountryCode;
  height?: string;
  eyeColor?: EyeColorCode;
  hairColor?: HairColorCode;
}
