import { describe, expect, it, jest } from "@jest/globals";
import { buildEbts } from "../buildEbts";

// The builder reaches the camera library for its finger names only; the
// native half of it is not there under test.
jest.mock("@/modules/slapshot-capture-library/src", () => ({
  FingerType: {},
}));

const text = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

const build = (documents?: object[], fingers: object[] = []) =>
  text(
    buildEbts({
      tot: "DPRS",
      type1: {},
      biographics: {
        firstName: "ANNA",
        lastName: "ERIKSSON",
        collectionReason: "TEST",
        documents,
      } as never,
      faces: [],
      fingers: fingers as never,
    }).bytes,
  );

describe("the scanned document in the EBTS file", () => {
  it("is written as the collected identification, 2.8019", () => {
    const file = build([
      {
        identification: "L898902C3",
        cid: "PASS",
        country: "UTO",
        issueDate: "",
        expirationDate: new Date(2031, 3, 15),
      },
    ]);
    // number, kind, issuer, issued, expires, office, comment
    expect(file).toContain(
      "2.8019:L898902C3\x1fPASS\x1fUTO\x1f\x1f20310415\x1f\x1f",
    );
  });

  it("is left out when nothing was scanned", () => {
    expect(build()).not.toContain("2.8019:");
    expect(build([{ identification: "X1", country: "USA" }])).not.toContain(
      "2.8019:",
    );
  });
});

describe("the capture device of a print (14.904)", () => {
  const finger = (captureDevice: object) => ({
    fingerPosition: 2,
    image: "AAAA",
    captureDevice,
  });

  it("gives a camera print the make and model Android gives it, and says it has no serial", () => {
    expect(build(undefined, [finger({ make: "Slapshot" })])).toContain(
      "14.904:Sciometrics\x1fSlapshot\x1fNo Serial",
    );
  });

  it("leaves a scanner's own make, model and serial alone", () => {
    expect(
      build(undefined, [
        finger({ make: "IdentiFI", model: "SICIdentiFI-45I", serial: "12345" }),
      ]),
    ).toContain("14.904:IdentiFI\x1fSICIdentiFI-45I\x1f12345");
  });
});
