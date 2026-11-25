import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import IwNetwork from "@/modules/iw-network";
import { tHelper } from "@/translations/translationHelper";
import { logEvent, tcnTail } from "@/util/fieldLog";
import { toBase64 } from "./nist";

/**
 * NRTIO submission, as the Android app's NRTIOManager does it: the EBTS file
 * goes as the attachment of an e-mail, sent through the mail server and
 * account in ABIS settings, over a connection encrypted from the start.
 */

/** Where NRTIO takes transactions in (the Android app's fixed recipient). */
const NRTIO_RECIPIENT = "mw@mail.nrtio.com";
const PASSWORD_KEY = "nrtioPassword";
const DEFAULT_PORT = 465;

/** What a submission's card shows about NRTIO. */
export interface NrtioState {
  status: "sending" | "sent" | "failed";
  error?: string;
}

export class NrtioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NrtioError";
  }
}

interface Config {
  host: string;
  port: number;
  account: string;
  password: string;
  allowSelfSigned: boolean;
}

/** The NRTIO connection from ABIS settings; null when NRTIO isn't the ABIS. */
export const getNrtioConfig = async (): Promise<Config | null> => {
  const raw = await AsyncStorage.getItem("autofill");
  const abis = raw ? JSON.parse(raw)?.abisSettings : undefined;
  if (abis?.system !== "NRTIO") return null;
  const host = String(abis.nrtioHost ?? "").trim();
  const account = String(abis.nrtioAccount ?? "").trim();
  const password = (await SecureStore.getItemAsync(PASSWORD_KEY)) ?? "";
  if (!host || !account || !password) {
    throw new NrtioError(tHelper("nrtioNotSetUp"));
  }
  return {
    host,
    port: Number(abis.nrtioPort) || DEFAULT_PORT,
    account,
    password,
    allowSelfSigned: !!abis.nrtioAllowSelfSigned,
  };
};

/** E-mails the transaction to NRTIO. Throws with the reason if it fails. */
export const submitToNrtio = async (
  config: Config,
  tcn: string,
  eft: Uint8Array,
): Promise<NrtioState> => {
  if (!IwNetwork?.sendMail) throw new NrtioError(tHelper("nrtioNeedsBuild"));
  logEvent("nrtio", `submitting ${tcnTail(tcn)}`);
  try {
    await IwNetwork.sendMail({
      host: config.host,
      port: config.port,
      user: config.account,
      password: config.password,
      from: config.account,
      to: NRTIO_RECIPIENT,
      fileName: `${tcn.replace(/[^A-Za-z0-9._-]/g, "_")}.eft`,
      attachmentBase64: toBase64(eft),
      allowSelfSigned: config.allowSelfSigned,
      timeoutSeconds: 60,
    });
  } catch (error) {
    // The mail server's own words, in full, after what failed.
    const detail = error instanceof Error ? error.message : String(error);
    throw new NrtioError(`${tHelper("nrtioSendFailed")}: ${detail}`);
  }
  logEvent("nrtio", `submitted ${tcnTail(tcn)}`);
  return { status: "sent" };
};
