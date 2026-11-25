import { isLogExport, logEvent, purgeLogs, tcnTail } from "@/util/fieldLog";
import { isLatentExport } from "@/features/latent/saveLatentImages";
import { gcm } from "@noble/ciphers/aes";
import { uuid } from "expo-modules-core";
import {
  deleteAsync,
  documentDirectory,
  EncodingType,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  readDirectoryAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fromBase64, toBase64 } from "./nist";
import type { BioCoreState } from "./bioCore";
import type { NrtioState } from "./nrtio";

/**
 * Encrypted storage for DoD transactions, the iOS counterpart of Android's
 * TransactionEncryption. Each EBTS file is kept encrypted (AES-256-GCM) with a
 * key that lives in the iOS Keychain and never leaves the phone. A plain .eft
 * only exists after an export, which asks for the export passcode first.
 *
 * Per transaction, in a hidden folder of the app's documents:
 *   <tcn>.eft.enc   the EBTS file
 *   <tcn>.meta.enc  what the Submissions card shows (name, type, date, photo)
 */

const KEY_NAME = "iwVaultKey";
const FOLDER = `${documentDirectory}.transactions/`;

export interface DodSubmission {
  tcn: string;
  /** DPRS, MAP or CAR. */
  tot: string;
  name: string;
  /** ISO date-time. */
  createdAt: string;
  /** Small JPEG of the frontal face, base64. */
  thumbnail?: string;
  /** Where the transaction stands with BioCore, when it was sent there. */
  bioCore?: BioCoreState;
  /** Where it stands with NRTIO, when it was sent there. */
  nrtio?: NrtioState;
}

const hexToBytes = (hex: string) =>
  Uint8Array.from(hex.match(/.{2}/g) ?? [], (pair) => parseInt(pair, 16));

/** 16 random bytes from the system's UUID generator. */
const uuidBytes = () => hexToBytes(uuid.v4().replace(/-/g, ""));

let cachedKey: Uint8Array | undefined;

/** The vault key: created once, then kept in the Keychain. */
const getKey = async (): Promise<Uint8Array> => {
  if (cachedKey) return cachedKey;
  let hex = await SecureStore.getItemAsync(KEY_NAME);
  if (!hex || hex.length !== 64) {
    hex = (uuid.v4() + uuid.v4()).replace(/-/g, "");
    await SecureStore.setItemAsync(KEY_NAME, hex);
  }
  cachedKey = hexToBytes(hex);
  return cachedKey;
};

/** A fresh 12-byte nonce (the UUID bytes that are fully random). */
const newNonce = () => {
  const bytes = uuidBytes();
  return Uint8Array.from([...bytes.slice(0, 6), ...bytes.slice(9, 15)]);
};

/** nonce (12 bytes) followed by the ciphertext and its authentication tag. */
const encrypt = async (plain: Uint8Array): Promise<Uint8Array> => {
  const nonce = newNonce();
  const sealed = gcm(await getKey(), nonce).encrypt(plain);
  const out = new Uint8Array(nonce.length + sealed.length);
  out.set(nonce);
  out.set(sealed, nonce.length);
  return out;
};

const decrypt = async (sealed: Uint8Array): Promise<Uint8Array> =>
  gcm(await getKey(), sealed.subarray(0, 12)).decrypt(sealed.subarray(12));

const safeName = (tcn: string) => tcn.replace(/[^A-Za-z0-9._-]/g, "_");

const ensureFolder = async () => {
  const info = await getInfoAsync(FOLDER);
  if (!info.exists) await makeDirectoryAsync(FOLDER, { intermediates: true });
};

const writeSealed = async (file: string, plain: Uint8Array) =>
  writeAsStringAsync(FOLDER + file, toBase64(await encrypt(plain)), {
    encoding: EncodingType.Base64,
  });

const readSealed = async (file: string) =>
  decrypt(
    fromBase64(
      await readAsStringAsync(FOLDER + file, { encoding: EncodingType.Base64 }),
    ),
  );

// The card details are JSON, percent-encoded so every byte is plain ASCII.
const textToBytes = (text: string) =>
  Uint8Array.from(encodeURIComponent(text), (char) => char.charCodeAt(0));
const bytesToText = (bytes: Uint8Array) => {
  let text = "";
  for (let i = 0; i < bytes.length; i += 4096) {
    text += String.fromCharCode(...bytes.subarray(i, i + 4096));
  }
  return decodeURIComponent(text);
};

/**
 * Text sealed with the vault key, for other data that stays on this phone
 * (the recovery store). Base64, the nonce first, as the transaction files.
 */
export const sealText = async (text: string): Promise<string> =>
  toBase64(await encrypt(textToBytes(text)));

/** Reads back what sealText wrote. Throws if the text has been tampered with. */
export const openText = async (sealed: string): Promise<string> =>
  bytesToText(await decrypt(fromBase64(sealed)));

/** Stores a transaction encrypted. */
export const storeSubmission = async (
  submission: DodSubmission,
  ebts: Uint8Array,
) => {
  await ensureFolder();
  const name = safeName(submission.tcn);
  await writeSealed(`${name}.eft.enc`, ebts);
  await writeSealed(`${name}.meta.enc`, textToBytes(JSON.stringify(submission)));
  logEvent(
    "vault",
    `stored ${submission.tot} ${tcnTail(submission.tcn)}, ${Math.round(ebts.length / 1024)} KB`,
  );
};

/** Rewrites what a transaction's card shows (its EBTS file is untouched). */
export const updateSubmission = async (submission: DodSubmission) => {
  await ensureFolder();
  await writeSealed(
    `${safeName(submission.tcn)}.meta.enc`,
    textToBytes(JSON.stringify(submission)),
  );
};

/** The decrypted EBTS file of a stored transaction, in memory only. */
export const readSubmissionFile = (tcn: string) =>
  readSealed(`${safeName(tcn)}.eft.enc`);

/** Every stored transaction, newest first. */
export const listSubmissions = async (): Promise<DodSubmission[]> => {
  await ensureFolder();
  const files = await readDirectoryAsync(FOLDER);
  const submissions: DodSubmission[] = [];
  for (const file of files.filter((f) => f.endsWith(".meta.enc"))) {
    try {
      submissions.push(JSON.parse(bytesToText(await readSealed(file))));
    } catch (error) {
      console.warn("Could not read stored transaction", file, error);
    }
  }
  return submissions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const deleteSubmission = async (tcn: string) => {
  const name = safeName(tcn);
  await deleteAsync(`${FOLDER}${name}.eft.enc`, { idempotent: true });
  await deleteAsync(`${FOLDER}${name}.meta.enc`, { idempotent: true });
  logEvent("vault", `deleted ${tcnTail(tcn)}`);
};

/**
 * Decrypts the given transactions and writes each as <tcn>.eft at the top of
 * the app's documents, where the Files app and Finder can reach it. Returns
 * the names of the files written.
 */
export const exportSubmissions = async (tcns: string[]): Promise<string[]> => {
  const written: string[] = [];
  for (const tcn of tcns) {
    const name = safeName(tcn);
    const plain = await readSealed(`${name}.eft.enc`);
    await writeAsStringAsync(`${documentDirectory}${name}.eft`, toBase64(plain), {
      encoding: EncodingType.Base64,
    });
    written.push(`${name}.eft`);
    logEvent("export", `exported ${tcnTail(tcn)}`);
  }
  return written;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Retention (App Settings), applied whenever the app opens or Submissions is
 * shown:
 *  - stored (encrypted) transactions older than `submissionDays` are deleted;
 *  - exported, decrypted .eft files older than `exportDays` are deleted from
 *    the app's documents, so plain copies don't linger on the phone.
 */
export const purgeExpired = async (
  submissionDays: number,
  exportDays: number,
) => {
  const now = Date.now();
  try {
    for (const { tcn, createdAt } of await listSubmissions()) {
      const age = now - new Date(createdAt).getTime();
      if (age > submissionDays * DAY_MS) {
        logEvent("retention", `stored transaction past ${submissionDays} days`);
        await deleteSubmission(tcn);
      }
    }
  } catch (error) {
    console.warn("Could not apply submission retention", error);
  }
  try {
    const files = await readDirectoryAsync(documentDirectory as string);
    // Exported transactions, exported log files and saved latent images alike.
    for (const file of files.filter(
      (f) =>
        f.toLowerCase().endsWith(".eft") || isLogExport(f) || isLatentExport(f),
    )) {
      const info = await getInfoAsync(`${documentDirectory}${file}`);
      // modificationTime is in seconds.
      const modified = info.exists ? (info.modificationTime ?? 0) * 1000 : 0;
      if (modified && now - modified > exportDays * DAY_MS) {
        await deleteAsync(`${documentDirectory}${file}`, { idempotent: true });
        logEvent("retention", `exported file past ${exportDays} days removed`);
      }
    }
  } catch (error) {
    console.warn("Could not apply export retention", error);
  }
};

/** Retention days from App Settings, with the defaults for anything unset. */
export const retentionDays = (settings?: {
  retainSubmissionsDays?: number;
  retainExportsDays?: number;
}) => {
  const days = (value: unknown, fallback: number) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  return {
    submissionDays: days(settings?.retainSubmissionsDays, 100),
    exportDays: days(settings?.retainExportsDays, 2),
  };
};

/**
 * Applies retention using the settings as saved on the phone. Read from
 * storage (not from app state) on purpose: at startup the app state still
 * holds the built-in defaults for a moment, and a shorter default must never
 * delete what a longer saved setting would keep.
 */
export const applyRetention = async () => {
  let saved: Parameters<typeof retentionDays>[0];
  try {
    const raw = await AsyncStorage.getItem("autofill");
    saved = raw ? JSON.parse(raw)?.appSettings : undefined;
  } catch (error) {
    console.warn("Could not read the retention settings", error);
    return;
  }
  const { submissionDays, exportDays } = retentionDays(saved);
  await purgeExpired(submissionDays, exportDays);
  const logDays = Number((saved as { retainLogsDays?: number })?.retainLogsDays);
  await purgeLogs(Number.isFinite(logDays) && logDays > 0 ? logDays : 100);
};

/**
 * Clear Secure Data: deletes every stored transaction, every exported .eft
 * and the vault key itself. Nothing stored before this can be read again.
 */
export const wipeVault = async () => {
  await deleteAsync(FOLDER, { idempotent: true });
  const files = await readDirectoryAsync(documentDirectory as string);
  for (const file of files.filter((f) => f.toLowerCase().endsWith(".eft"))) {
    await deleteAsync(`${documentDirectory}${file}`, { idempotent: true });
  }
  await SecureStore.deleteItemAsync(KEY_NAME);
  cachedKey = undefined;
  logEvent("vault", "secure data cleared");
};
