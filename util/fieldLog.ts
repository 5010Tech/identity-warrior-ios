import {
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  readDirectoryAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

/**
 * Field log: what the app did and what went wrong, kept on the phone so a
 * user can export it and send it in when something fails in the field.
 *
 * Rules for what goes in:
 *  - events and error messages only; never names, dates of birth or any other
 *    biographic value, never images, passwords or the export passcode;
 *  - nothing that identifies the unit or its systems: no agency identifiers,
 *    host names, addresses or scanner serial numbers. A transaction is
 *    referred to by the tail of its number (month/day, time and a random
 *    figure), enough to match a line to a submission card;
 *  - every message is scrubbed (see `scrub`) before it is written, as a
 *    backstop for text that comes from error messages.
 *
 * One plain-text file per day in a hidden folder of the app's documents.
 */

const FOLDER = `${documentDirectory}.logs/`;
const EXPORT_PREFIX = "IdentityWarrior-logs-";
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");
const dayName = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clock = (d: Date) =>
  `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/** Removes anything that could identify a person, a unit or a system. */
export const scrub = (text: string) =>
  text
    .replace(/[\r\n]+/g, " ")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, "<email>")
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, "<url>")
    .replace(/(?:\/[\w.@%+-]+){2,}/g, "<path>")
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "<ip>")
    .replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi, "<host>")
    .replace(/\d{7,}/g, "<num>")
    .slice(0, 300);

/** The part of a transaction number that is safe to log. */
export const tcnTail = (tcn: string) => {
  const parts = tcn.split("-");
  // ORI-yyyymmddhhmmss-IWAR-0100-random: keep month/day, time and the random
  // figure (in short groups, so the scrubber leaves them alone).
  if (parts.length < 5 || parts[1].length < 14) return "<tcn>";
  return `${parts[1].slice(4, 8)}-${parts[1].slice(8)}-${parts[4]}`;
};

let pending: string[] = [];
let writing: Promise<void> = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | undefined;

const flush = () => {
  timer = undefined;
  if (!pending.length) return;
  const lines = pending;
  pending = [];
  writing = writing
    .then(async () => {
      const info = await getInfoAsync(FOLDER);
      if (!info.exists) {
        await makeDirectoryAsync(FOLDER, { intermediates: true });
      }
      const file = `${FOLDER}${dayName(new Date())}.log`;
      const existing = (await getInfoAsync(file)).exists
        ? await readAsStringAsync(file)
        : "";
      await writeAsStringAsync(file, existing + lines.join("\n") + "\n");
    })
    .catch(() => undefined); // logging must never break the app
};

/**
 * Adds a line: time, area of the app, what happened, and the error if any.
 * `details` are scrubbed; pass only event facts (counts, sizes, codes).
 */
export const logEvent = (area: string, details: string, error?: unknown) => {
  let line = `${clock(new Date())} [${area}] ${scrub(details)}`;
  if (error !== undefined) {
    const e = error as { name?: string; message?: string };
    line += ` | ${scrub(`${e?.name ?? "Error"}: ${e?.message ?? String(error)}`)}`;
  }
  pending.push(line);
  // Errors are written at once; routine events are batched briefly.
  if (error !== undefined) flush();
  else if (!timer) timer = setTimeout(flush, 1500);
};

let installed = false;

/**
 * Also records what the app already reports as errors and warnings, and any
 * crash, so problems are captured without each screen having to log them.
 * Only message text and error names/messages are taken, never other objects.
 */
export const installFieldLog = (version?: string) => {
  if (installed) return;
  installed = true;
  logEvent("app", `started, version ${version ?? "?"}`);
  const describe = (args: unknown[]) =>
    args
      .map((arg) =>
        typeof arg === "string"
          ? arg
          : arg instanceof Error
            ? `${arg.name}: ${arg.message}`
            : "",
      )
      .filter(Boolean)
      .join(" ");
  (["error", "warn"] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      const text = describe(args);
      if (text) logEvent(level, text);
      if (level === "error") flush();
    };
  });
  const errorUtils = (
    globalThis as {
      ErrorUtils?: {
        getGlobalHandler: () => (error: unknown, fatal?: boolean) => void;
        setGlobalHandler: (
          handler: (error: unknown, fatal?: boolean) => void,
        ) => void;
      };
    }
  ).ErrorUtils;
  if (errorUtils) {
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, fatal) => {
      logEvent(fatal ? "crash" : "uncaught", "unhandled error", error);
      previous(error, fatal);
    });
  }
};

/** Deletes daily log files older than `days` ("retain logs" in App Settings). */
export const purgeLogs = async (days: number) => {
  try {
    if (!(await getInfoAsync(FOLDER)).exists) return;
    const cutoff = dayName(new Date(Date.now() - days * DAY_MS));
    for (const file of await readDirectoryAsync(FOLDER)) {
      if (file.endsWith(".log") && file.slice(0, 10) < cutoff) {
        await deleteAsync(FOLDER + file, { idempotent: true });
      }
    }
  } catch {
    // nothing to clean up
  }
};

/** True for a log export file sitting in the shared documents folder. */
export const isLogExport = (file: string) =>
  file.startsWith(EXPORT_PREFIX) && file.endsWith(".txt");

/**
 * Writes every stored day into one text file at the top of the app's
 * documents (Files app / Finder) and returns its name.
 */
export const exportLogs = async (): Promise<string> => {
  flush();
  await writing;
  const days = (await getInfoAsync(FOLDER)).exists
    ? (await readDirectoryAsync(FOLDER)).filter((f) => f.endsWith(".log")).sort()
    : [];
  let text = "";
  for (const file of days) {
    text += `===== ${file.slice(0, 10)} =====\n`;
    text += await readAsStringAsync(FOLDER + file);
  }
  const now = new Date();
  const name = `${EXPORT_PREFIX}${dayName(now)}-${clock(now).replace(/:/g, "")}.txt`;
  await writeAsStringAsync(`${documentDirectory}${name}`, text || "(no log entries)\n");
  return name;
};
