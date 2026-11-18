import { tHelper } from "@/translations/translationHelper";
import {
  BiographicData,
  CountryCode,
  DLData,
  DocumentDTO,
  DocumentType,
  MRZData,
  SexCode,
} from "@/types";
import { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import { Alert } from "react-native";

type SetBiographicValue = UseFormSetValue<BiographicData>;
type GetBiographicValues = UseFormGetValues<BiographicData>;

function setIfPresent(
  setValue: SetBiographicValue,
  key: keyof BiographicData,
  value: BiographicData[keyof BiographicData] | undefined,
) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  setValue(key, value as never, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
}

function mergeDocument(
  setValue: SetBiographicValue,
  getValues: GetBiographicValues,
  nextDocument: DocumentDTO,
) {
  const docs = getValues("documents") || [];
  const existingIndex = docs.findIndex(
    (doc) => doc.identification === nextDocument.identification,
  );

  if (existingIndex === -1) {
    setValue("documents", [...docs, nextDocument], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    return;
  }

  Alert.alert(tHelper("error"), tHelper("docExists"), [
    {
      text: tHelper("add"),
      onPress: () =>
        setValue("documents", [...docs, nextDocument], {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        }),
    },
    {
      text: tHelper("replace"),
      onPress: () => {
        const nextDocs = [...docs];
        nextDocs[existingIndex] = nextDocument;
        setValue("documents", nextDocs, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
    },
    {
      text: tHelper("continue"),
      style: "cancel",
    },
  ]);
}

export function applyDLScanResult(
  parsed: DLData,
  setValue: SetBiographicValue,
  getValues: GetBiographicValues,
) {
  const mappedValues: Partial<BiographicData> = {
    firstName: parsed.firstName,
    middleName: parsed.middleName,
    lastName: parsed.lastName,
    dob: parsed.dob,
    sex: parsed.sex,
    height: parsed.height ? Number(parsed.height) : undefined,
    eyeColor: parsed.eyeColor,
    hairColor: parsed.hairColor,
  };

  Object.entries(mappedValues).forEach(([key, value]) => {
    setIfPresent(setValue, key as keyof BiographicData, value);
  });

  const description = [
    parsed.addressStreet,
    [parsed.city, parsed.state, parsed.postalCode].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  mergeDocument(setValue, getValues, {
    country: (parsed.country || "") as CountryCode,
    description,
    expirationDate: parsed.expirationDate || "",
    issueDate: parsed.issueDate || "",
    type: "ID",
    identification: parsed.licenseNumber || "",
  });
}

function normalizeMrzSex(sex: MRZData["sex"]): SexCode {
  if (sex === "M" || sex === "F") {
    return sex;
  }

  return "U";
}

function documentTypeFromMrz(documentType: string): DocumentType {
  return documentType.startsWith("P") ? "P" : "ID";
}

export function applyMRZScanResult(
  parsed: MRZData,
  setValue: SetBiographicValue,
  getValues: GetBiographicValues,
) {
  const mappedValues: Partial<BiographicData> = {
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    dob: parsed.dob,
    sex: normalizeMrzSex(parsed.sex),
    citizenship: parsed.nationality as CountryCode,
    birthCountry: parsed.issuingCountry as CountryCode,
  };

  Object.entries(mappedValues).forEach(([key, value]) => {
    setIfPresent(setValue, key as keyof BiographicData, value);
  });

  mergeDocument(setValue, getValues, {
    country: parsed.issuingCountry as CountryCode,
    description: "MRZ scan",
    expirationDate: parsed.expirationDate || "",
    issueDate: "",
    type: documentTypeFromMrz(parsed.documentType),
    identification: parsed.documentNumber,
  });
}
