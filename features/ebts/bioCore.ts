import AsyncStorage from "@react-native-async-storage/async-storage";
import { sha256 } from "@noble/hashes/sha2";
import * as SecureStore from "expo-secure-store";
import { logEvent, tcnTail } from "@/util/fieldLog";
import { DOD_DEFAULTS } from "@/constants/dodDefaults";
import IwNetwork from "@/modules/iw-network";
import { tHelper } from "@/translations/translationHelper";
import { toBase64 } from "./nist";

/**
 * BioCore submission, following the Android app's BioCoreManager:
 *   1. POST /api/v1/sessions                 device credential -> access token
 *   2. POST /api/v1/submissions              { clientReference: TCN }
 *   3. POST .../artifacts                    declare the EFT
 *   4. PUT  .../artifacts/{id}/content       the EFT bytes (SHA-256 checked)
 *   5. POST .../submit
 * Every step is safe to repeat: the TCN is the idempotency key, so a retry
 * picks up the same submission and skips what BioCore already has.
 *
 * Host and port come from ABIS settings; the device credential is read from
 * the Keychain, where the ABIS settings screen stores it.
 */

const CREDENTIAL_KEY = "bioCoreCredential";

export class BioCoreError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = "BioCoreError";
    this.code = code;
  }
}

/** What a submission's card shows about BioCore. */
export interface BioCoreState {
  /** sent = handed over; completed / failed = BioCore's final word. */
  status: "sending" | "sent" | "completed" | "failed";
  submissionId?: string;
  encounterId?: string;
  error?: string;
}

interface Config {
  base: string;
  credential: string;
  /** ABIS settings: accept the server's certificate as it is. */
  allowSelfSigned?: boolean;
}

interface Reply {
  status: number;
  ok: boolean;
  text: string;
}

/** Tells a certificate refusal from a server that could not be reached. */
const networkProblem = (error: unknown, selfSigned: boolean) => {
  const code = Number(/E_NETWORK_(-?\d+)/.exec(String((error as any)?.code))?.[1]);
  // NSURLErrorSecureConnectionFailed .. ClientCertificateRequired
  if (code <= -1200 && code >= -1206) {
    return new BioCoreError(tHelper("bioCoreCertRefused"));
  }
  if (!code && selfSigned && !IwNetwork) {
    return new BioCoreError(tHelper("bioCoreNeedsBuild"));
  }
  return new BioCoreError(tHelper("bioCoreUnreachable"));
};

/**
 * One HTTPS request. With "allow self-signed certificate" on it goes through
 * the app's own native request, which accepts the BioCore host's certificate
 * as it is; otherwise the normal fetch, with the normal certificate checks.
 */
const send = async (
  config: Config,
  url: string,
  method: string,
  headers: Record<string, string>,
  json?: string,
  raw?: Uint8Array,
): Promise<Reply> => {
  try {
    if (config.allowSelfSigned && IwNetwork) {
      const { status, body } = await IwNetwork.request({
        url,
        method,
        headers,
        body: json,
        bodyBase64: raw ? toBase64(raw) : undefined,
        allowSelfSigned: true,
        timeoutSeconds: 120,
      });
      return { status, ok: status >= 200 && status < 300, text: body };
    }
    const response = await fetch(url, {
      method,
      headers,
      // A copy with its own buffer: exactly these bytes and nothing around them.
      body: raw ? (raw.slice().buffer as ArrayBuffer) : json,
    });
    return {
      status: response.status,
      ok: response.ok,
      text: await response.text(),
    };
  } catch (error) {
    logEvent(
      "biocore",
      `request did not complete (${String((error as any)?.code ?? "no code")})`,
      error,
    );
    throw networkProblem(error, !!config.allowSelfSigned);
  }
};

/** Just the host: drops any scheme, path or ":port" someone typed in. */
const cleanHost = (host: string) => {
  let h = host.trim().replace(/^https?:\/\//i, "");
  const slash = h.indexOf("/");
  if (slash >= 0) h = h.slice(0, slash);
  if (!h.startsWith("[") && h.split(":").length === 2) h = h.split(":")[0];
  return h;
};

/** The saved BioCore settings, or null when BioCore isn't the chosen ABIS. */
export const getBioCoreConfig = async (): Promise<Config | null> => {
  const raw = await AsyncStorage.getItem("autofill");
  const abis = raw ? JSON.parse(raw)?.abisSettings : undefined;
  if (abis?.system !== "BIOCORE") return null;
  // Anything left blank falls back to the built-in defaults.
  const host = cleanHost(
    String(abis.bioCoreHost || DOD_DEFAULTS.bioCoreHost),
  );
  const credential = (
    (await SecureStore.getItemAsync(CREDENTIAL_KEY)) ||
    DOD_DEFAULTS.bioCoreCredential
  ).trim();
  if (!host || !credential) {
    throw new BioCoreError("BioCore is not set up: enter the host and device credential in ABIS settings.");
  }
  const port = Number(abis.bioCorePort || DOD_DEFAULTS.bioCorePort);
  const base =
    !port || port === 443 ? `https://${host}` : `https://${host}:${port}`;
  return { base, credential, allowSelfSigned: !!abis.bioCoreAllowSelfSigned };
};

// One access token is shared until it is about to expire.
let token: { value: string; base: string; expires: number } | undefined;

const describe = (code: number, text: string) => {
  let detail = "";
  try {
    const err = JSON.parse(text);
    const title = err.title ?? err.Title ?? "";
    const d = err.detail ?? err.Detail ?? "";
    detail = d ? (title ? `${title}: ${d}` : d) : title;
  } catch {
    // not JSON
  }
  if (code === 404) return "BioCore 404 - the submission API is not available on this server";
  if (code === 403) return "BioCore 403 - this device credential is not allowed to submit";
  return `BioCore ${code}${detail ? ` - ${detail}` : ""}`;
};

const openSession = async (config: Config, forceNew: boolean) => {
  const { base, credential } = config;
  if (
    !forceNew &&
    token &&
    token.base === base &&
    token.expires - Date.now() > 60_000
  ) {
    return token.value;
  }
  const response = await send(
    config,
    `${base}/api/v1/sessions`,
    "POST",
    { "Content-Type": "application/json" },
    JSON.stringify({ deviceCredential: credential }),
  );
  const { text } = response;
  if (!response.ok) throw new BioCoreError(describe(response.status, text), response.status);
  const session = JSON.parse(text);
  const expires = Date.parse(session.expiresAtUtc ?? "");
  token = {
    value: session.accessToken,
    base,
    expires: Number.isNaN(expires) ? Date.now() + 5 * 60_000 : expires,
  };
  return token.value;
};

/** One API call, with the bearer token; a 401 gets one retry on a new session. */
const call = async (
  config: Config,
  method: string,
  path: string,
  json?: object,
  raw?: Uint8Array,
): Promise<Record<string, any>> => {
  for (let attempt = 0; ; attempt += 1) {
    const bearer = await openSession(config, attempt > 0);
    const headers: Record<string, string> = { Authorization: `Bearer ${bearer}` };
    let body: string | undefined;
    if (raw) {
      headers["Content-Type"] = "application/octet-stream";
    } else if (json) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(json);
    }
    const response = await send(
      config,
      `${config.base}/api/v1${path}`,
      method,
      headers,
      body,
      raw,
    );
    const { text } = response;
    if (response.status === 401 && attempt === 0) continue;
    if (!response.ok) throw new BioCoreError(describe(response.status, text), response.status);
    return text.trim() ? JSON.parse(text) : {};
  }
};

const isSent = (status?: string) =>
  status === "submitted" || status === "processing" || status === "completed";

const failureText = (s: Record<string, any>) => {
  const code = s.lastErrorCode ?? "";
  const message = s.lastError ?? "";
  if (!code && !message) return "BioCore: failed";
  return code && message ? `${code}: ${message}` : code || message;
};

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** Sends one EBTS file. Resolves with what BioCore said; throws on failure. */
export const submitToBioCore = async (
  config: Config,
  tcn: string,
  eft: Uint8Array,
): Promise<BioCoreState> => {
  logEvent("biocore", `submitting ${tcnTail(tcn)}`);
  const created = await call(config, "POST", "/submissions", {
    clientReference: tcn,
  });
  const submissionId: string = created.submissionId;
  const path = `/submissions/${submissionId}`;
  if (isSent(created.status)) {
    // Already sent on an earlier attempt whose reply was lost.
    return { status: "sent", submissionId, encounterId: created.encounterId };
  }
  if (created.status === "failed") throw new BioCoreError(failureText(created));

  // The EFT: skip it if BioCore already has it, finish it if it was declared.
  const existing = (created.artifacts ?? []).find(
    (a: Record<string, any>) => a.purpose === "original-eft",
  );
  if (existing?.uploadState !== "ready") {
    try {
      const artifactId =
        existing?.uploadState === "pending" && existing.artifactId
          ? existing.artifactId
          : (
              await call(config, "POST", `${path}/artifacts`, {
                purpose: "original-eft",
                fileName: `${tcn}.eft`,
                mediaType: "application/octet-stream",
              })
            ).artifactId;
      const uploaded = await call(
        config,
        "PUT",
        `${path}/artifacts/${artifactId}/content`,
        undefined,
        eft,
      );
      if (String(uploaded.sha256 ?? "").toLowerCase() !== hex(sha256(eft))) {
        throw new BioCoreError("The uploaded file did not match what was sent.");
      }
    } catch (error) {
      // 409: the content was already finalized by an earlier attempt.
      if (!(error instanceof BioCoreError && error.code === 409)) throw error;
    }
  }

  let encounterId: string | undefined;
  try {
    encounterId = (await call(config, "POST", `${path}/submit`)).encounterId;
  } catch (error) {
    // 409: already submitted; confirm it with the status.
    if (!(error instanceof BioCoreError && error.code === 409)) throw error;
    const status = await call(config, "GET", `${path}/status`);
    if (!isSent(status.status)) {
      throw new BioCoreError(status.lastError ? failureText(status) : error.message, 409);
    }
    encounterId = status.encounterId;
  }
  logEvent("biocore", `submitted ${tcnTail(tcn)}`);
  return { status: "sent", submissionId, encounterId };
};

/** BioCore's current word on a submission that was sent. */
export const checkBioCoreStatus = async (
  config: Config,
  state: BioCoreState,
): Promise<BioCoreState> => {
  if (!state.submissionId) return state;
  const status = await call(
    config,
    "GET",
    `/submissions/${state.submissionId}/status`,
  );
  if (status.status === "completed") return { ...state, status: "completed" };
  if (status.status === "failed") {
    return { ...state, status: "failed", error: failureText(status) };
  }
  return state;
};
