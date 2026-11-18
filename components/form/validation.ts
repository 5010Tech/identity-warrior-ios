import { identifyingNumberTypes } from "@/constants/SelectOptions";
import { TransactionType } from "@/types";
import { format } from "date-fns";
import { z } from "zod";
import { tHelper } from "@/translations/translationHelper";

export const biographicsFormSchema = (tot: TransactionType) =>
  z
    .object({
      firstName: z.string(),
      lastName: z.string(),
      sex: z.string().min(1, tHelper("reqField")),
      height: z.coerce
        .number()
        .int()
        .positive()
        .min(10, { message: tHelper("gtTen") })
        .max(108, { message: tHelper("lt108") })
        .optional()
        .or(z.null()),
      weight: z.coerce
        .number()
        .int()
        .positive()
        .min(1, { message: tHelper("gtOne") })
        .max(499, { message: tHelper("lt499") })
        .optional()
        .or(z.null()),
      eyeColor: z.string(),
      hairColor: z.string(),
      race: z.string(),
      dob: z.coerce
        .string()
        .nullable()
        .transform((date) => date && format(date, "yyyy-MM-dd")),
      birthCountry: z.string(),
      citizenship: z.string(),
      collectionReason: z.string(),
      mnu: z.string(),
      mnuType: z.string(),
      dnaId: z.string(),
      dnaSystem: z.string(),
      documents: z
        .array(
          z.object({
            country: z.string(),
            description: z.string(),
            expirationDate: z.coerce
              .string()
              .nullable()
              .transform((date) => date && format(date, "yyyy-MM-dd")),
            issueDate: z.coerce
              .string()
              .nullable()
              .transform((date) => date && format(date, "yyyy-MM-dd")),
            type: z.string().min(1, tHelper("reqField")),
            identification: z.string().min(1, tHelper("reqField")),
          }),
        )
        .min(
          ["Enroll", "Verify"].includes(tot) ? 1 : 0,
          `${tHelper("idReq")} ${tot}`,
        ),
    })
    .superRefine((data, ctx) => {
      const mnuType = data.mnuType;
      const mnu = data.mnu;
      const mnuLength = mnu.length;
      const mnuTypeLength = mnuType.length;
      const dnaId = data.dnaId;
      const dnaIdLength = dnaId.length;
      const dnaSytem = data.dnaSystem;
      const dnaSystemLength = dnaSytem.length;
      if (
        (mnuLength > 0 && mnuTypeLength === 0) ||
        (mnuTypeLength > 0 && mnuLength === 0)
      ) {
        if (mnuLength === 0) {
          ctx.addIssue({
            path: ["mnu"],
            code: z.ZodIssueCode.custom,
            message: `${tHelper("provideVal")} ${
              identifyingNumberTypes.find((type) => type.value === mnuType)
                ?.label || mnuType
            }.`,
          });
        }
        if (mnuTypeLength === 0) {
          ctx.addIssue({
            path: ["mnuType"],
            code: z.ZodIssueCode.custom,
            message: tHelper("provideIdNum"),
          });
        }
      }
      if (
        (dnaIdLength > 0 && dnaSystemLength === 0) ||
        (dnaSystemLength > 0 && dnaIdLength === 0)
      ) {
        console.log("ID: " + dnaIdLength);
        console.log("SYS: " + dnaSystemLength);
        if (dnaIdLength === 0) {
          ctx.addIssue({
            path: ["dnaId"],
            code: z.ZodIssueCode.custom,
            message: tHelper("provideDnaVal"),
          });
        }
        if (dnaSystemLength === 0) {
          ctx.addIssue({
            path: ["dnaSystem"],
            code: z.ZodIssueCode.custom,
            message: tHelper("provideSystem"),
          });
        }
      }
    });
