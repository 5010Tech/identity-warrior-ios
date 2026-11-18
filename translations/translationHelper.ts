import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import en from "@/translations/en.json";
import es from "@/translations/es.json";
import fr from "@/translations/fr.json";
import pt from "@/translations/pt.json";

const i18n = new I18n({
  en: en,
  es: es,
  fr: fr,
  pt: pt,
});

i18n.locale = getLocales()[0].languageCode || "en";

export type translationKey = keyof typeof en;

export function tHelper(key: translationKey) {
  return i18n.t(key);
}
