import { describe, expect, it } from "@jest/globals";
import {
  describeAttempt,
  findMrz,
  MrzReadTracker,
  OcrLine,
  readsNeeded,
  zoneBox,
} from "../mrzAssembler";
import {
  checkDigit,
  fullyValid,
  mrzDate,
  MrzRecord,
  parseMrzLines,
  parseMrzText,
} from "../mrzRecord";

/** The ICAO 9303 specimen zones. */
const SPECIMEN: Record<string, string[]> = {
  TD3: [
    "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
    "L898902C36UTO7408122F1204159ZE184226B<<<<<10",
  ],
  TD1: [
    "I<UTOD231458907<<<<<<<<<<<<<<<",
    "7408122F1204159UTO<<<<<<<<<<<6",
    "ERIKSSON<<ANNA<MARIA<<<<<<<<<<",
  ],
  TD2: [
    "I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<",
    "D231458907UTO7408122F1204159<<<<<<<6",
  ],
  MRVA: [
    "V<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
    "L8988901C4XXX4009078F96121096ZE184226B<<<<<<",
  ],
  MRVB: [
    "V<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<",
    "L8988901C4XXX4009078F9612109<<<<<<<<",
  ],
};

/** Rows of text as the recognizer hands them over, top to bottom. */
const ocr = (rows: string[]): OcrLine[] =>
  rows.map((text, i) => ({
    text,
    x: 0.05,
    y: 0.9 - i * 0.1,
    width: 0.9,
    height: 0.06,
  }));

const read = (rows: string[]) => findMrz(ocr(rows));
const must = (record: MrzRecord | null): MrzRecord => {
  if (!record) throw new Error("no zone read");
  return record;
};

describe("parsing a zone at its full length", () => {
  it.each(Object.entries(SPECIMEN))("%s specimen", (format, lines) => {
    const record = must(parseMrzLines(lines));
    expect(record.format).toBe(format);
    expect(fullyValid(record)).toBe(true);
    expect(record.surname).toBe("ERIKSSON");
    expect(record.givenNames).toBe("ANNA MARIA");
  });

  it("reads the passport's fields", () => {
    const record = must(parseMrzLines(SPECIMEN.TD3));
    expect(record).toMatchObject({
      documentCode: "P",
      issuingCountry: "UTO",
      nationality: "UTO",
      documentNumber: "L898902C3",
      dateOfBirth: "740812",
      sex: "F",
      expirationDate: "120415",
      optional: "ZE184226B",
    });
  });

  it("reads a zone run together, as a chip stores it", () => {
    expect(fullyValid(must(parseMrzText(SPECIMEN.TD3.join(""))))).toBe(true);
    expect(fullyValid(must(parseMrzText(SPECIMEN.TD1.join(""))))).toBe(true);
    expect(fullyValid(must(parseMrzText(SPECIMEN.TD2.join(""))))).toBe(true);
  });

  it("follows a card's document number into the optional field", () => {
    const number = "123456789012";
    const l1 =
      `IDBEL${number.slice(0, 9)}<${number.slice(9)}${checkDigit(number)}`.padEnd(
        30,
        "<",
      );
    let l2 = "7408122F1204159BEL<<<<<<<<<<<";
    l2 += checkDigit(
      l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29),
    );
    const record = must(parseMrzLines([l1, l2, SPECIMEN.TD1[2]]));
    expect(record.documentNumber).toBe(number);
    expect(fullyValid(record)).toBe(true);
  });
});

describe("reading a zone from the camera's text", () => {
  it.each(Object.entries(SPECIMEN))("%s as printed", (format, lines) => {
    expect(must(read(lines)).lines).toEqual(lines);
  });

  const shrink = (line: string, by: number) =>
    line.replace(/<{4,}/, (run) => "<".repeat(Math.max(1, run.length - by)));
  const grow = (line: string, by: number) =>
    line.replace(/<{4,}/, (run) => run + "<".repeat(by));

  it.each(Object.entries(SPECIMEN))(
    "%s with miscounted fillers",
    (_, lines) => {
      for (const by of [1, 2, 3]) {
        expect(must(read(lines.map((line) => shrink(line, by)))).lines).toEqual(
          lines,
        );
        expect(must(read(lines.map((line) => grow(line, by)))).lines).toEqual(
          lines,
        );
      }
    },
  );

  it("ignores the print around the zone, and stray spaces in it", () => {
    const record = read([
      "Passport / Passeport  Type P",
      "Surname / Nom  ERIKSSON",
      "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<< <<<<<<<<<<<",
      SPECIMEN.TD3[1],
      "page 3",
    ]);
    expect(must(record).lines).toEqual(SPECIMEN.TD3);
  });

  it("takes guillemets and a K among the fillers for fillers", () => {
    expect(
      must(read(["P<UTOERIKSSON«ANNA<MARIA«««««««««", SPECIMEN.TD3[1]]))
        .surname,
    ).toBe("ERIKSSON");
    expect(
      must(
        read(["PKUTOERIKSSON<<ANNA<MARIA<<<<<<K<<<<<<<<<<<<", SPECIMEN.TD3[1]]),
      ).lines,
    ).toEqual(SPECIMEN.TD3);
  });

  it("reads look-alikes as digits where only digits can be, letters where only letters", () => {
    const digits = read([
      SPECIMEN.TD3[0],
      "L898902C36UTO74O8I22F12O4I59ZE184226B<<<<<1O",
    ]);
    expect(must(digits).lines[1]).toBe(SPECIMEN.TD3[1]);
    const letters = must(
      read(["P<UT0ER1KSS0N<<ANNA<MAR1A<<<<<<<<<<<<<<<<<<<", SPECIMEN.TD3[1]]),
    );
    expect(letters.surname).toBe("ERIKSSON");
    expect(letters.issuingCountry).toBe("UTO");
  });

  it("does not guess at a look-alike in the document number", () => {
    const misread = "L8989O2C36UTO7408122F1204159ZE184226B<<<<<10";
    expect(read([SPECIMEN.TD3[0], misread])).toBeNull();
    // ...but takes the recognizer's own second reading when that one checks out.
    const lines = ocr([SPECIMEN.TD3[0], misread]);
    lines[1].alternates = [SPECIMEN.TD3[1]];
    expect(must(findMrz(lines)).documentNumber).toBe("L898902C3");
  });

  it("joins a line the recognizer returned in pieces", () => {
    const record = findMrz([
      {
        text: "P<UTOERIKSSON<<ANNA",
        x: 0.05,
        y: 0.8,
        width: 0.4,
        height: 0.06,
      },
      {
        text: "<MARIA<<<<<<<<<<<<<<<<<<<",
        x: 0.47,
        y: 0.805,
        width: 0.5,
        height: 0.06,
      },
      { text: SPECIMEN.TD3[1], x: 0.05, y: 0.7, width: 0.9, height: 0.06 },
    ]);
    expect(must(record).lines).toEqual(SPECIMEN.TD3);
  });
});

describe("refusing what does not check out", () => {
  it("rejects a date whose check digit is wrong", () => {
    expect(
      read([SPECIMEN.TD3[0], "L898902C36UTO7408123F1204159ZE184226B<<<<<10"]),
    ).toBeNull();
  });

  it("rejects text that is not a zone", () => {
    expect(
      read([
        "HELLO WORLD THIS IS NOT AN MRZ AT ALL OK",
        "ANOTHER LINE OF 1234567890 TEXT THAT IS LONG",
      ]),
    ).toBeNull();
  });

  it("asks for more readings the less the check digits vouch for", () => {
    expect(readsNeeded(must(parseMrzLines(SPECIMEN.TD3)))).toBe(2);
    expect(readsNeeded(must(parseMrzLines(SPECIMEN.MRVA)))).toBe(3);
    // Fields right, composite wrong: SmartScanner's looser rule.
    const loose = must(
      read([SPECIMEN.TD3[0], "L898902C36UTO7408122F1204159ZE184226B<<<<<11"]),
    );
    expect(fullyValid(loose)).toBe(false);
    expect(readsNeeded(loose)).toBe(4);
  });

  it("holds a zone back until it has been read again", () => {
    const tracker = new MrzReadTracker();
    const record = must(parseMrzLines(SPECIMEN.TD3));
    expect(tracker.add(record)).toBeNull();
    expect(tracker.add(record)).toBe(record);
  });

  it("lets through no single misread that a check digit can catch", () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";
    const value = (c: string) =>
      c >= "0" && c <= "9" ? Number(c) : c === "<" ? 0 : c.charCodeAt(0) - 55;
    let seed = 7;
    const random = () =>
      (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (const format of ["TD3", "TD2", "TD1"]) {
      const lines = SPECIMEN[format];
      const truth = must(parseMrzLines(lines));
      const at = format === "TD1" ? 0 : 1;
      for (let n = 0; n < 3000; n += 1) {
        const line = lines[at];
        const position = Math.floor(random() * line.length);
        const wrong = alphabet[Math.floor(random() * alphabet.length)];
        if (wrong === line[position]) continue;
        const noisy = [...lines];
        noisy[at] = line.slice(0, position) + wrong + line.slice(position + 1);
        const record = read(noisy);
        if (!record || !fullyValid(record)) continue;
        const changed =
          record.documentNumber !== truth.documentNumber ||
          record.dateOfBirth !== truth.dateOfBirth ||
          record.expirationDate !== truth.expirationDate;
        // What still gets through is what the ICAO check digit cannot see:
        // two characters whose values differ by a multiple of ten.
        if (changed)
          expect(Math.abs(value(wrong) - value(line[position])) % 10).toBe(0);
      }
    }
  });
});

describe("showing where the zone is", () => {
  it("boxes the lines of the zone and nothing else", () => {
    const box = zoneBox(
      ocr(["Passport / Passeport  Type P", ...SPECIMEN.TD3, "page 3"]),
    );
    // Rows two and three of four: y 0.8 and 0.7, each 0.06 high.
    expect(box?.x).toBeCloseTo(0.05);
    expect(box?.width).toBeCloseTo(0.9);
    expect(box?.y).toBeCloseTo(0.67);
    expect(box?.height).toBeCloseTo(0.16);
  });

  it("finds nothing in ordinary print", () => {
    expect(zoneBox(ocr(["Surname / Nom  ERIKSSON", "Given names"]))).toBeNull();
  });
});

describe("saying why a zone was not read, without saying what it says", () => {
  it("names the check digits that failed", () => {
    const why = describeAttempt(
      ocr([SPECIMEN.TD3[0], "L898902C36UTO7408123F1204159ZE184226B<<<<<10"]),
    );
    expect(why).toBe(
      "rows [44 44], nearest TD3: number ok, birth wrong, expiry ok, composite wrong",
    );
    expect(why).not.toContain("ERIKSSON");
    expect(why).not.toContain("L898902C3");
  });
});

describe("dates", () => {
  const today = new Date(2026, 10, 25);
  it("puts a birth date in the latest century that keeps it in the past", () => {
    expect(mrzDate("740812", "birth", today)?.getFullYear()).toBe(1974);
    expect(mrzDate("120101", "birth", today)?.getFullYear()).toBe(2012);
    expect(mrzDate("400101", "birth", today)?.getFullYear()).toBe(1940);
  });
  it("puts an expiry date in this century", () => {
    expect(mrzDate("310101", "expiry", today)?.getFullYear()).toBe(2031);
  });
  it("refuses a date that is not one", () => {
    expect(mrzDate("741341", "birth", today)).toBeUndefined();
  });
});
