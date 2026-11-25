import { gcm } from "@noble/ciphers/aes";
import { sha512 } from "@noble/hashes/sha2";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { uuid } from "expo-modules-core";
import * as SecureStore from "expo-secure-store";
import { fromBase64 } from "@/features/ebts/nist";
import { utf8ToText } from "@/features/ebts/readEbts";
import { logEvent } from "@/util/fieldLog";

/**
 * Identity Warrior licenses, the same files the Android app takes (iwa.lic):
 * a JSON document encrypted with AES-GCM under the built-in secret, saying
 * until when the app may be used, on which devices, and optionally the ABIS
 * connections to set up. The app is locked until a valid one is imported.
 */

/** The secret the files are encrypted with: from .env.local, never the source. */
const LICENSE_SECRET = process.env.EXPO_PUBLIC_IW_LICENSE_SECRET ?? "";
/** The fixed nonce the license files are written with. */
const NONCE = "5010TechCiph";

const DEVICE_ID_KEY = "iwDeviceId";
const RECORD_KEY = "iwLicense";
const BIOCORE_SIG_KEY = "iwLicenseBioCoreSig";

export type LicenseProblem =
  | "none"
  | "unreadable"
  | "deviceMismatch"
  | "expired"
  | "insiteOnly"
  | "notConfigured";

/** What is kept of an imported license (in the Keychain). */
export interface LicenseRecord {
  /** MM/dd/yyyy, as in the license. */
  expiration: string;
  /** Set when the license names devices: the one it was accepted for. */
  deviceId?: string;
  allowLatent: boolean;
}

/** Text to UTF-8 bytes. */
const utf8 = (text: string) => {
  const out: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
};

/**
 * This phone's ID for licensing, shown on the license screen. iOS has no
 * hardware ID an app may read, so one is made on first use and kept in the
 * Keychain, for this device only: it survives the app being deleted and
 * reinstalled, and does not travel to another phone in a backup.
 */
export const getDeviceId = async (): Promise<string> => {
  const options = {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY, options);
  if (!id) {
    // Sixteen hexadecimal characters, the shape of an Android device ID.
    id = uuid.v4().replace(/-/g, "").slice(0, 16);
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id, options);
  }
  return id;
};

/** The license file's JSON, or null if this is not a license for this app. */
export const decryptLicense = (
  file: Uint8Array,
): Record<string, unknown> | null => {
  try {
    const key = sha512(utf8(LICENSE_SECRET)).slice(0, 16);
    const json = utf8ToText(gcm(key, utf8(NONCE)).decrypt(file));
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

/** MM/dd/yyyy to a date at midnight; null if it is not one. */
const parseExpiration = (text: string): Date | null => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const date = new Date(+match[3], +match[1] - 1, +match[2]);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatExpiration = (date: Date) =>
  `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;

/** As on Android: good until the day before the expiration date. */
const isExpired = (expiration: string) => {
  const date = parseExpiration(expiration);
  if (!date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() <= today.getTime();
};

const sameId = (a: unknown, b: string) =>
  typeof a === "string" && !!a.trim() && a.trim().toLowerCase() === b.toLowerCase();

/** Checks a decrypted license against this phone and today's date. */
const evaluate = (
  lic: Record<string, unknown>,
  deviceId: string,
): { problem: LicenseProblem; record?: LicenseRecord } => {
  let bound = false;
  if ("deviceId" in lic) {
    if (!sameId(lic.deviceId, deviceId)) return { problem: "deviceMismatch" };
    bound = true;
  } else if (Array.isArray(lic.deviceIds)) {
    if (!lic.deviceIds.some((id) => sameId(id, deviceId))) {
      return { problem: "deviceMismatch" };
    }
    bound = true;
  }

  // A license with no date runs for its number of months from the import.
  let expiration = typeof lic.expiration === "string" ? lic.expiration : "";
  if (!expiration && Number(lic.validMonths) > 0) {
    const until = new Date();
    until.setMonth(until.getMonth() + Number(lic.validMonths));
    expiration = formatExpiration(until);
  }
  if (!parseExpiration(expiration)) return { problem: "unreadable" };
  if (isExpired(expiration)) return { problem: "expired" };
  if (lic.insiteOnly === true) return { problem: "insiteOnly" };

  return {
    problem: "none",
    record: {
      expiration,
      deviceId: bound ? deviceId : undefined,
      allowLatent: lic.allowLatent !== false,
    },
  };
};

const listeners = new Set<() => void>();
/** Calls back whenever the stored license changes. */
export const watchLicense = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The stored license and whether it still holds, for the lock and the menus. */
export const checkStoredLicense = async (): Promise<{
  problem: LicenseProblem | "missing";
  record?: LicenseRecord;
}> => {
  const raw = await SecureStore.getItemAsync(RECORD_KEY);
  if (!raw) return { problem: "missing" };
  let record: LicenseRecord;
  try {
    record = JSON.parse(raw);
  } catch {
    return { problem: "missing" };
  }
  if (record.deviceId && !sameId(record.deviceId, await getDeviceId())) {
    return { problem: "deviceMismatch" };
  }
  if (isExpired(record.expiration)) return { problem: "expired", record };
  return { problem: "none", record };
};

const text = (value: unknown) => (value == null ? "" : String(value).trim());

/**
 * The ABIS connections a license carries, written into ABIS settings as the
 * Android app does on a license import: NRTIO and SFTP replace what was
 * there; BioCore replaces it when the license's values are new.
 */
const applyAbisSettings = async (lic: Record<string, unknown>) => {
  const raw = await AsyncStorage.getItem("autofill");
  const autofill = raw ? JSON.parse(raw) : {};
  const abis: Record<string, unknown> = {
    system: "NONE",
    ...(autofill.abisSettings ?? {}),
  };
  let changed = false;

  if (text(lic.nrtioHost)) {
    abis.nrtioHost = text(lic.nrtioHost);
    abis.nrtioPort = text(lic.nrtioPort);
    abis.nrtioAccount = text(lic.nrtioEmail);
    if (text(lic.nrtioPassword)) {
      await SecureStore.setItemAsync("nrtioPassword", String(lic.nrtioPassword));
    }
    changed = true;
  }
  if (text(lic.sftpUser)) {
    abis.sftpHost = text(lic.sftpHost) || "sftp.biometrics.mil";
    abis.sftpPort = text(lic.sftpPort) || "22";
    abis.sftpAccount = text(lic.sftpUser);
    if (text(lic.sftpPass)) {
      await SecureStore.setItemAsync("sftpPassword", String(lic.sftpPass));
    }
    changed = true;
  }
  if (text(lic.bioCoreHost) && text(lic.bioCoreCredential)) {
    const host = text(lic.bioCoreHost)
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "");
    const port = text(lic.bioCorePort) || "443";
    const credential = text(lic.bioCoreCredential);
    // Only when the license's values differ from the ones last applied, so
    // changes made by hand in ABIS settings are otherwise left alone.
    const sig = Array.from(sha512(utf8(`${host}|${port}|${credential}`)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (sig !== (await AsyncStorage.getItem(BIOCORE_SIG_KEY))) {
      abis.bioCoreHost = host;
      abis.bioCorePort = port;
      await SecureStore.setItemAsync("bioCoreCredential", credential);
      await AsyncStorage.setItem(BIOCORE_SIG_KEY, sig);
      changed = true;
    }
  }
  return changed ? abis : null;
};

/**
 * Imports a license file. Returns what was wrong with it, or "none" and the
 * ABIS settings to save (null when the license carries none).
 */
export const importLicense = async (
  fileBase64: string,
): Promise<{
  problem: LicenseProblem;
  abisSettings?: Record<string, unknown> | null;
}> => {
  if (!LICENSE_SECRET) return { problem: "notConfigured" };
  let file: Uint8Array;
  try {
    file = fromBase64(fileBase64);
  } catch {
    return { problem: "unreadable" };
  }
  const lic = decryptLicense(file);
  if (!lic) {
    logEvent("license", "import failed: not a license file");
    return { problem: "unreadable" };
  }
  const { problem, record } = evaluate(lic, await getDeviceId());
  if (problem !== "none" || !record) {
    logEvent("license", `import failed: ${problem}`);
    return { problem };
  }
  await SecureStore.setItemAsync(RECORD_KEY, JSON.stringify(record));
  const abisSettings = await applyAbisSettings(lic).catch((error) => {
    logEvent("license", "could not apply the license's ABIS settings", error);
    return null;
  });
  logEvent(
    "license",
    `license imported: expires ${record.expiration}, latent ` +
      `${record.allowLatent ? "allowed" : "not allowed"}` +
      `${record.deviceId ? ", bound to this device" : ""}`,
  );
  listeners.forEach((listener) => listener());
  return { problem: "none", abisSettings };
};
