import latentCodes from "@/constants/latentCodes.json";
import { languageIndex } from "@/translations/translationHelper";

interface Labelled {
  value: string;
  labels: string[];
}

const toOptions = (items: Labelled[]) =>
  items.map(({ value, labels }) => ({
    value,
    label: labels[languageIndex] ?? labels[0],
  }));

/** Latent impression types (13.003), the Android app's list. */
export const latentImpressionTypes = toOptions(latentCodes.impressionTypes);

/** Friction ridge generalized positions (13.013), the Android app's list. */
export const latentPositions = toOptions(latentCodes.positions);

/** Defaults of the Android latent transaction form. */
export const LATENT_DEFAULTS = {
  attentionIndicator: "UNKNOWN",
  extension: "0000",
  caseIdPrefix: "UNKNOWN",
  caseId: "UNKNOWN",
};
