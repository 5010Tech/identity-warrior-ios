import { logEvent } from "@/util/fieldLog";
import {
  documentDirectory,
  EncodingType,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { LatentPrint } from "./latentStore";

const EXPORT_PREFIX = "latent-";

const pad = (n: number) => String(n).padStart(2, "0");

/** True for a saved latent image sitting in the shared documents folder. */
export const isLatentExport = (file: string) =>
  file.startsWith(EXPORT_PREFIX) && file.toLowerCase().endsWith(".png");

/**
 * Saves scaled latent prints as PNG files at the top of the app's documents
 * (Files app / Finder), named as the Android app names them, print<n>_<dpi>.png,
 * behind a date and time so a later save does not replace an earlier one.
 * Returns the file names.
 */
export const saveLatentImages = async (
  items: { print: LatentPrint; number: number }[],
): Promise<string[]> => {
  const now = new Date();
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const names: string[] = [];
  for (const { print, number } of items) {
    const name = `${EXPORT_PREFIX}${stamp}-print${number}_${print.dpi}.png`;
    await writeAsStringAsync(`${documentDirectory}${name}`, print.pngBase64, {
      encoding: EncodingType.Base64,
    });
    names.push(name);
  }
  logEvent("latent", `saved ${names.length} image(s)`);
  return names;
};
