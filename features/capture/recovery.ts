import { openText, sealText } from "@/features/ebts/vault";
import { logEvent } from "@/util/fieldLog";
import {
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { CaptureState } from "./types";

/**
 * Recovery store, the iOS counterpart of Android's saveForRecovery: what has
 * been collected is written to the phone as it comes in, so a crash, a
 * reboot or an operator who leaves the app does not lose the collection. The
 * next start offers to carry on where it stopped.
 *
 * In a hidden folder of the app's documents, sealed with the vault key (the
 * same key the stored transactions use, so biometrics are never on disk in
 * the clear):
 *
 *   state.json    the collection without its images, rewritten as it grows
 *   blobs/<name>  one image, written once and then only referenced
 *
 * Keeping the images out of state.json is what makes saving cheap: a saved
 * print or photo is sealed once, and every later save rewrites only the
 * small part.
 */

const FOLDER = `${documentDirectory}.recovery/`;
const BLOBS = `${FOLDER}blobs/`;
const STATE = `${FOLDER}state.json`;
/** Strings this long (images, WSQ) are kept in their own file. */
const BLOB_MIN = 4096;

/** What the collection holds, for the prompt and the log. */
export interface RecoveryHeader {
  /** Enroll, Identify, Verify: the route the collection was started on. */
  transactionType: string;
  /** dprs, map or car. */
  dodTot?: string;
  /** When it was last written (ISO). */
  savedAt: string;
  faces: number;
  fingers: number;
  rolled: number;
  irises: number;
  smts: number;
  palms: number;
  voice: boolean;
}

/**
 * The parts of the capture state that are worth keeping, in the order they
 * are put back: what the collection screen's tick marks and the review
 * screens need first, then the screen images, which are the bulk of it.
 */
const KEPT = [
  "dodTot",
  "biographicsComplete",
  "transaction",
  "rolledFingers",
  "smts",
  "palms",
  "voice",
  "pngFingers",
  "pngRolledFingers",
  "slaps",
] as const;

type Kept = (typeof KEPT)[number];
export type RecoveredState = Partial<Pick<CaptureState, Kept>>;

/** A long string that lives in its own file. */
interface BlobRef {
  $blob: string;
}

const isBlobRef = (value: unknown): value is BlobRef =>
  !!value &&
  typeof value === "object" &&
  typeof (value as BlobRef).$blob === "string";

/** File name of each long string already written, so it is written once. */
const written = new Map<string, string>();
let blobCount = 0;

const ensureFolders = async () => {
  if (!(await getInfoAsync(BLOBS)).exists) {
    await makeDirectoryAsync(BLOBS, { intermediates: true });
  }
};

/** Replaces every long string with a reference to its own sealed file. */
const externalize = async (value: unknown): Promise<unknown> => {
  if (typeof value === "string") {
    if (value.length < BLOB_MIN) return value;
    const already = written.get(value);
    if (already) return { $blob: already };
    const name = `b${Date.now().toString(36)}${blobCount++}`;
    await writeAsStringAsync(BLOBS + name, await sealText(value));
    written.set(value, name);
    return { $blob: name };
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) out.push(await externalize(item));
    return out;
  }
  if (value && typeof value === "object") {
    if (value instanceof Date) return value.toISOString();
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = await externalize(item);
    }
    return out;
  }
  return value;
};

/** Puts the images back where they came from. */
const internalize = async (value: unknown): Promise<unknown> => {
  if (isBlobRef(value)) {
    const text = await openText(await readAsStringAsync(BLOBS + value.$blob));
    // Known to be on disk already: a later save points at the same file.
    written.set(text, value.$blob);
    return text;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) out.push(await internalize(item));
    return out;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = await internalize(item);
    }
    return out;
  }
  return value;
};

/** True once anything at all has been collected: nothing else is worth saving. */
export const hasCollected = (state: CaptureState): boolean =>
  !!(
    state.transaction?.faces?.length ||
    state.transaction?.fingers?.length ||
    state.transaction?.irises?.length ||
    state.rolledFingers?.length ||
    state.smts?.length ||
    state.palms?.length ||
    state.voice?.uri ||
    state.transaction?.biographicData?.lastName
  );

const headerOf = (
  state: CaptureState,
  transactionType: string,
): RecoveryHeader => ({
  transactionType,
  dodTot: state.dodTot,
  savedAt: new Date().toISOString(),
  faces: state.transaction?.faces?.length ?? 0,
  fingers: state.transaction?.fingers?.length ?? 0,
  rolled: state.rolledFingers?.length ?? 0,
  irises: state.transaction?.irises?.length ?? 0,
  smts: state.smts?.length ?? 0,
  palms: state.palms?.length ?? 0,
  voice: !!state.voice?.uri,
});

/** Nothing is saved while the collection is being submitted or has been. */
let suspended = false;

/**
 * Keeps what has been collected so far. Called as the collection grows; the
 * images it has already written are left alone.
 */
export const saveRecovery = async (
  state: CaptureState,
  transactionType: string,
) => {
  if (suspended || !hasCollected(state)) return;
  try {
    await ensureFolders();
    const kept: Record<string, unknown> = {};
    for (const key of KEPT) {
      if (state[key] !== undefined) kept[key] = await externalize(state[key]);
    }
    await writeAsStringAsync(
      STATE,
      await sealText(
        JSON.stringify({ header: headerOf(state, transactionType), kept }),
      ),
    );
  } catch (error) {
    logEvent("recovery", "could not save the collection", error);
  }
};

/** What is there to recover, if anything. */
export const findRecovery = async (): Promise<RecoveryHeader | null> => {
  try {
    if (!(await getInfoAsync(STATE)).exists) return null;
    const saved = JSON.parse(await openText(await readAsStringAsync(STATE)));
    const header = saved?.header as RecoveryHeader | undefined;
    return header?.transactionType ? header : null;
  } catch (error) {
    logEvent("recovery", "could not read the saved collection", error);
    return null;
  }
};

/**
 * Puts the saved collection back, a part at a time: `onPart` is called with
 * each one as it is ready, so the collection screen fills in as it goes
 * rather than waiting for every image to be read and unsealed.
 */
export const loadRecovery = async (
  onPart: <K extends Kept>(name: K, value: CaptureState[K]) => void,
): Promise<RecoveryHeader | null> => {
  const startedAt = Date.now();
  try {
    const saved = JSON.parse(await openText(await readAsStringAsync(STATE)));
    const header = saved?.header as RecoveryHeader | undefined;
    if (!header) return null;
    suspended = false;
    const kept = (saved.kept ?? {}) as Record<string, unknown>;
    for (const key of KEPT) {
      if (!(key in kept)) continue;
      const value = (await internalize(kept[key])) as CaptureState[typeof key];
      onPart(key, value);
    }
    logEvent(
      "recovery",
      `restored ${header.dodTot?.toUpperCase() ?? header.transactionType} in ` +
        `${Date.now() - startedAt} ms: ${header.faces} face, ` +
        `${header.fingers} finger, ${header.rolled} rolled, ` +
        `${header.irises} iris, ${header.smts} smt, ${header.palms} palm, ` +
        `voice ${header.voice ? "yes" : "no"}`,
    );
    return header;
  } catch (error) {
    logEvent("recovery", "could not restore the saved collection", error);
    return null;
  }
};

/** Throws the saved collection away: submitted, or the operator said no. */
export const clearRecovery = async (why: string) => {
  written.clear();
  try {
    if ((await getInfoAsync(FOLDER)).exists) {
      await deleteAsync(FOLDER, { idempotent: true });
      logEvent("recovery", `saved collection cleared: ${why}`);
    }
  } catch (error) {
    logEvent("recovery", "could not clear the saved collection", error);
  }
};

/** Stops saving (the collection has been submitted), until the next one. */
export const suspendRecovery = (stop: boolean) => {
  suspended = stop;
};

/**
 * The operator answered yes to the prompt: the capture screens coming up
 * take their data from the saved collection instead of starting empty.
 */
let requested = false;
export const requestRecovery = () => {
  requested = true;
};
export const takeRequestedRecovery = () => {
  const was = requested;
  requested = false;
  return was;
};

/** The prompt is offered once per app start. */
let asked = false;
export const takeRecoveryPrompt = () => {
  const was = asked;
  asked = true;
  return !was;
};
