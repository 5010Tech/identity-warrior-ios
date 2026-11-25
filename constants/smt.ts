import smtCodes from "@/constants/smtCodes.json";
import {
  languageIndex,
  tHelper,
  translationKey,
} from "@/translations/translationHelper";

interface Labelled {
  value: string;
  labels: string[];
}

const toOptions = (items: Labelled[]) =>
  items.map(({ value, labels }) => ({
    value,
    label: labels[languageIndex] ?? labels[0],
  }));

/** Scar / mark / tattoo categories, same list as the Android app. */
export const smtCategories = toOptions(smtCodes.categories);

/** NCIC SMT codes for a category (the Android app's per-category lists). */
export const smtCodesFor = (category?: string) =>
  toOptions((smtCodes.codes as Record<string, Labelled[]>)[category ?? ""] ?? []);

export const smtCategoryLabel = (category: string) =>
  smtCategories.find((c) => c.value === category)?.label ?? category;

export const smtCodeLabel = (category: string, code: string) =>
  smtCodesFor(category).find((c) => c.value === code)?.label ?? code;

/** SMT image type (Type-10), with the accent color the Android cards use for it. */
const SMT_TYPES: Record<string, { label: translationKey; color: string }> = {
  TATTOO: { label: "smtTypeTattoo", color: "#6A1B9A" },
  SCAR: { label: "smtTypeScar", color: "#E65100" },
  MARK: { label: "smtTypeMark", color: "#1565C0" },
  MISSING: { label: "smtTypeMissing", color: "#C62828" },
  OTHER: { label: "smtTypeOther", color: "#00796B" },
};

/** Which image type each category is filed under (Android SMTEdit). */
const CATEGORY_TYPE: Record<string, keyof typeof SMT_TYPES> = {
  tattoos: "TATTOO",
  scars: "SCAR",
  mole: "MARK",
  piercing: "OTHER",
  discoloration: "MARK",
  missing: "MISSING",
  needleMark: "MARK",
  drugAbuse: "MARK",
  fracture: "MARK",
  healedFracture: "MARK",
  removedTattoo: "TATTOO",
  appearance: "OTHER",
  disability: "OTHER",
  medicalEquipment: "OTHER",
  extra: "OTHER",
  therapeutic: "OTHER",
};

/**
 * The EBTS image type (Type-10 field 10.003) for an SMT category: SCAR, MARK
 * or TATTOO. Anything that is neither a scar nor a tattoo is a mark.
 */
export const smtImageType = (category: string): "SCAR" | "MARK" | "TATTOO" => {
  const type = CATEGORY_TYPE[category];
  return type === "TATTOO" || type === "SCAR" ? type : "MARK";
};

export const smtTypeFor = (category: string) => {
  const type = SMT_TYPES[CATEGORY_TYPE[category] ?? "OTHER"];
  return { label: tHelper(type.label), color: type.color };
};

/** SMT code indicators (Android getSMTIndicatorCodes). */
export const smtIndicators = toOptions(smtCodes.indicators);

/**
 * The indicator Android preselects for each category. Categories that aren't
 * listed here don't use an indicator at all, and the field is hidden.
 */
export const DEFAULT_INDICATOR: Record<string, string> = {
  tattoos: "TATTOO",
  scars: "SCAR",
  mole: "BIRTHMARK",
  piercing: "PIERCING",
  discoloration: "BIRTHMARK",
  needleMark: "MARK",
  drugAbuse: "MARK",
  fracture: "MARK",
  healedFracture: "MARK",
  removedTattoo: "TATTOO",
};

/** Tattoo details (Android getTattooClasses / getTattooSubClasses / getTattoColor). */
export const tattooClasses = toOptions(smtCodes.tattooClasses);
export const tattooSubClasses = toOptions(smtCodes.tattooSubClasses);
export const tattooColors = toOptions(smtCodes.tattooColors);
export const MAX_TATTOO_COLORS = 6;
