import { readSubmissionFile } from "./vault";

/**
 * Reads the descriptive records back out of a stored transaction: the Type-1
 * (transaction information) and Type-2 (biographic data) records, which are
 * plain text. The image records that follow are not touched.
 *
 * A field is a list of subfields, each a list of items, as the standard has
 * it: `fields.get("2.8040")?.[0]?.[2]` is the third item of the first
 * subfield of field 2.8040.
 */
export type EbtsFields = Map<string, string[][]>;

const FS = 0x1c;
const GS = "\u001d";
const RS = "\u001e";
const US = "\u001f";

/** UTF-8 to text; the app's JavaScript engine has no decoder built in. */
export const utf8ToText = (bytes: Uint8Array): string => {
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let code = b;
    let extra = 0;
    if (b >= 0xf0) [code, extra] = [b & 0x07, 3];
    else if (b >= 0xe0) [code, extra] = [b & 0x0f, 2];
    else if (b >= 0xc0) [code, extra] = [b & 0x1f, 1];
    for (let j = 1; j <= extra; j += 1) {
      code = (code << 6) | ((bytes[i + j] ?? 0) & 0x3f);
    }
    out += String.fromCodePoint(code);
    i += extra + 1;
  }
  return out;
};

export const parseEbtsText = (file: Uint8Array): EbtsFields => {
  const fields: EbtsFields = new Map();
  let start = 0;
  // The first two records only: Type-1, then Type-2.
  for (let n = 0; n < 2 && start < file.length; n += 1) {
    let end = file.indexOf(FS, start);
    if (end < 0) end = file.length;
    const text = utf8ToText(file.subarray(start, end));
    // Only the Type-2 may follow the Type-1 here; anything else is an image.
    if (n === 1 && !text.startsWith("2.")) break;
    text.split(GS).forEach((field) => {
      const colon = field.indexOf(":");
      if (colon < 0) return;
      const [type, number] = field.slice(0, colon).split(".");
      // "2.024" and "2.8040" alike, without the padding.
      const tag = `${Number(type)}.${Number(number)}`;
      fields.set(
        tag,
        field
          .slice(colon + 1)
          .split(RS)
          .map((subfield) => subfield.split(US)),
      );
    });
    start = end + 1;
  }
  return fields;
};

/** The Type-1 and Type-2 fields of a stored transaction. */
export const readSubmissionFields = async (tcn: string) =>
  parseEbtsText(await readSubmissionFile(tcn));
