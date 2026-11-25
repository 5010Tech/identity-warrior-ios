import { tHelper } from "@/translations/translationHelper";
import { z } from "zod";

const required = () => tHelper("valueRequired");
const ascii = (v: string) => /^[\x00-\x7F]*$/.test(v);

/** A field that must have a value (text or a picked option). */
const requiredText = z.preprocess(
  (v) => (v == null ? "" : String(v).trim()),
  z.string().min(1, { message: required() }),
);

const optionalText = z.preprocess(
  (v) => (v == null ? "" : String(v)),
  z.string(),
);

/** Whole number of at least two digits, as the Android form requires. */
const twoDigitNumber = (max?: number) =>
  z.preprocess(
    (v) => (v == null ? "" : String(v).trim()),
    z
      .string()
      .min(1, { message: required() })
      .refine((v) => String(parseInt(v, 10)).length >= 2, {
        message: tHelper("twoDigitMin"),
      })
      .refine((v) => max === undefined || parseInt(v, 10) <= max, {
        message: tHelper("weightMax"),
      }),
  );

/** A date that must be set and can't be in the future. */
const pastDate = z.preprocess(
  (v) => (v ? new Date(v as string | Date) : undefined),
  z
    .date({
      required_error: required(),
      invalid_type_error: required(),
    })
    .refine((d) => d.getTime() <= Date.now(), {
      message: tHelper("futureDate"),
    }),
);

/**
 * DoD Type-2 (biographic) rules, following the Android app's Type2Activity for
 * EBTS 4.1. `dodTot` is the transaction: "car" (Criminal Applicant) replaces
 * Reason For Collection with the Arrest fields.
 */
export const dodBiographicsSchema = (dodTot?: string) => {
  const isCar = dodTot === "car";
  return z
    .object({
      firstName: requiredText,
      middleName: optionalText,
      lastName: requiredText,
      fourthName: optionalText,
      fifthName: optionalText,
      sex: requiredText,
      height: twoDigitNumber(),
      weight: twoDigitNumber(499),
      eyeColor: requiredText,
      hairColor: requiredText,
      race: requiredText,
      dob: pastDate,
      birthCountry: requiredText,
      citizenship: requiredText,
      personnelType: requiredText,
      dnaId: optionalText,
      dnaSystem: optionalText,
      collectionReason: isCar ? optionalText : requiredText,
      internment: isCar
        ? z.preprocess(
            (v) => (v == null ? "" : String(v).trim()),
            z
              .string()
              .min(1, { message: required() })
              .min(15, { message: tHelper("fifteenChars") })
              .refine(ascii, { message: tHelper("asciiOnly") }),
          )
        : optionalText,
      arrestDate: isCar ? pastDate : z.any().optional(),
      arrestOffense: isCar
        ? z.preprocess(
            (v) => (v == null ? "" : String(v).trim()),
            z
              .string()
              .min(1, { message: required() })
              .refine(ascii, { message: tHelper("asciiOnly") }),
          )
        : optionalText,
    })
    .passthrough();
};
