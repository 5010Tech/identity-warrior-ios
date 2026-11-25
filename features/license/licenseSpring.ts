import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha2";
import { toBase64 } from "@/features/ebts/nist";
import { logEvent } from "@/util/fieldLog";
import { getDeviceId } from "./license";

/**
 * Download License, as the Android app's LicenseSpringManager does it: the
 * license key is activated for this device with LicenseSpring, and the
 * Identity Warrior license comes back in the activated license's custom
 * field "iw" (the same encrypted file as a .lic, in base64).
 */

const API = "https://api.licensespring.com/api/v4";
/** From .env.local, never the source. */
const API_KEY = process.env.EXPO_PUBLIC_LICENSESPRING_API_KEY ?? "";
const SHARED_KEY = process.env.EXPO_PUBLIC_LICENSESPRING_SHARED_KEY ?? "";

/** XXXX-XXXX-XXXX-XXXX, letters and digits. */
export const isLicenseKey = (key: string) =>
  /^[A-Za-z0-9]{4}(-[A-Za-z0-9]{4}){3}$/.test(key);

export const licenseSpringConfigured = () => !!API_KEY && !!SHARED_KEY;

const ascii = (text: string) =>
  Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff);

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const two = (n: number) => String(n).padStart(2, "0");

/** Thu, 17 Nov 2022 20:51:35 GMT */
const httpDate = () => {
  const now = new Date();
  return (
    `${DAYS[now.getUTCDay()]}, ${two(now.getUTCDate())} ` +
    `${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()} ` +
    `${two(now.getUTCHours())}:${two(now.getUTCMinutes())}:${two(now.getUTCSeconds())} GMT`
  );
};

export class LicenseSpringError extends Error {}

/**
 * Activates the key for this device and returns the Identity Warrior license
 * it carries, in base64. Throws LicenseSpringError with LicenseSpring's own
 * message when it refuses.
 */
export const downloadLicense = async (
  productCode: string,
  licenseKey: string,
): Promise<string> => {
  const date = httpDate();
  // Signed with the shared key, as LicenseSpring's API asks.
  const signature = toBase64(
    hmac(sha256, ascii(SHARED_KEY), ascii(`licenseSpring\ndate: ${date}`)),
  );
  const response = await fetch(`${API}/activate_license`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Date: date,
      Authorization: `algorithm="hmac-sha256",headers="date",signature="${signature}",apikey="${API_KEY}"`,
    },
    body: JSON.stringify({
      hardware_id: await getDeviceId(),
      product: productCode,
      license_key: licenseKey,
    }),
  });
  const text = await response.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    logEvent("license", `LicenseSpring refused: status ${response.status}`);
    throw new LicenseSpringError(
      String(body?.message ?? body?.detail ?? `HTTP ${response.status}`),
    );
  }
  const field = (body?.custom_fields ?? []).find(
    (item: { name?: string }) => item?.name === "iw",
  );
  const value = String(field?.value ?? "").trim();
  if (!value) {
    logEvent("license", "LicenseSpring license carries no Identity Warrior license");
    throw new LicenseSpringError("");
  }
  return value;
};
