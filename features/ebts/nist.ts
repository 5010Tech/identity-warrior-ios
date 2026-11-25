/**
 * ANSI/NIST-ITL "traditional" encoding, the binary format of an EBTS file
 * (.eft). This is the part the Android app gets from the MITRE library
 * (org.mitre.jet.ebts.EbtsBuilder).
 *
 * A file is a sequence of records. A record is a list of tagged fields:
 *
 *   <type>.<field>:<value> GS <type>.<field>:<value> GS ... FS
 *
 * A value can repeat (occurrences, separated by RS) and each occurrence can
 * have several items (separated by US). The first field of every record is
 * its length in bytes; an image record ends with field 999, the image itself.
 */

const FS = 0x1c; // ends a record
const GS = 0x1d; // between fields
const RS = "\x1e"; // between occurrences of a field
const US = "\x1f"; // between items of an occurrence

/** One item, a list of items (one occurrence), or a list of occurrences. */
export type FieldValue = string | string[] | string[][];

export interface NistRecord {
  type: number;
  fields: Map<number, FieldValue>;
  /** Field 999: the image or other binary data. */
  data?: Uint8Array;
}

export const record = (type: number): NistRecord => ({
  type,
  fields: new Map(),
});

/** Sets a field unless the value is empty. */
export const setField = (
  rec: NistRecord,
  field: number,
  value: FieldValue | null | undefined,
) => {
  if (value == null) return;
  if (typeof value === "string" && value === "") return;
  if (Array.isArray(value) && value.length === 0) return;
  rec.fields.set(field, value);
};

const utf8 = (text: string): Uint8Array => {
  const out: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) {
      out.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
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

const flatten = (value: FieldValue): string => {
  if (typeof value === "string") return value;
  if (value.length && Array.isArray(value[0])) {
    return (value as string[][]).map((items) => items.join(US)).join(RS);
  }
  return (value as string[]).join(US);
};

const tag = (type: number, field: number) =>
  `${type}.${String(field).padStart(3, "0")}:`;

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let at = 0;
  parts.forEach((part) => {
    out.set(part, at);
    at += part.length;
  });
  return out;
};

/** One record, with its length field (001) worked out. */
export const encodeRecord = (rec: NistRecord): Uint8Array => {
  const parts: Uint8Array[] = [];
  [...rec.fields.keys()]
    .filter((field) => field !== 1 && field !== 999)
    .sort((a, b) => a - b)
    .forEach((field) => {
      parts.push(
        utf8(tag(rec.type, field) + flatten(rec.fields.get(field) ?? "")),
      );
    });
  if (rec.data) parts.push(concat([utf8(tag(rec.type, 999)), rec.data]));

  // Everything after the length field, each field followed by its separator.
  const bodyLength = parts.reduce((n, part) => n + part.length + 1, 0);
  // The length counts its own field too, so its digit count feeds back in.
  const prefix = tag(rec.type, 1);
  let length = prefix.length + 1 + bodyLength;
  let digits = 1;
  while (String(length + digits).length !== digits) digits += 1;
  length += digits;

  const out: Uint8Array[] = [utf8(prefix + String(length)), Uint8Array.of(GS)];
  parts.forEach((part, i) => {
    out.push(part, Uint8Array.of(i === parts.length - 1 ? FS : GS));
  });
  return concat(out);
};

/**
 * A whole file. `records[0]` is the Type-1; its content field (1.003) is
 * filled in here from the records that follow: how many there are, then each
 * one's type and IDC (field 002).
 */
export const encodeFile = (records: NistRecord[]): Uint8Array => {
  const [type1, ...rest] = records;
  type1.fields.set(3, [
    ["1", String(rest.length)],
    ...rest.map((rec) => [
      String(rec.type),
      flatten(rec.fields.get(2) ?? "00"),
    ]),
  ]);
  return concat(records.map(encodeRecord));
};

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export const fromBase64 = (text: string): Uint8Array => {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let at = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]);
    const b = B64.indexOf(clean[i + 1]);
    const c = i + 2 < clean.length ? B64.indexOf(clean[i + 2]) : -1;
    const d = i + 3 < clean.length ? B64.indexOf(clean[i + 3]) : -1;
    out[at++] = (a << 2) | (b >> 4);
    if (c >= 0) out[at++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) out[at++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, at);
};

export const toBase64 = (bytes: Uint8Array): string => {
  const chunks: string[] = [];
  let chunk = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : -1;
    const c = i + 2 < bytes.length ? bytes[i + 2] : -1;
    chunk += B64[a >> 2];
    chunk += B64[((a & 3) << 4) | (b < 0 ? 0 : b >> 4)];
    chunk += b < 0 ? "=" : B64[((b & 15) << 2) | (c < 0 ? 0 : c >> 6)];
    chunk += c < 0 ? "=" : B64[c & 63];
    if (chunk.length >= 8192) {
      chunks.push(chunk);
      chunk = "";
    }
  }
  chunks.push(chunk);
  return chunks.join("");
};
