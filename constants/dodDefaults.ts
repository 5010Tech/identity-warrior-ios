import { Type1Settings } from "@/types";

/**
 * Built-in DoD transaction defaults: the iOS counterpart of the Android app's
 * assets/application.properties. They pre-fill Type-1 settings and are what a
 * transaction uses for anything the operator has left blank.
 */
export const DOD_DEFAULTS = {
  /** originating.agency.id / originating.agency */
  ori: "BISCOTST1",
  oan: "CENTCOM J8",
  /** destination.agency.id / destination.agency */
  dai: "BISCOTST1",
  dan: "CENTCOM J8",
  /** controlling.agency.identifier (Type-2 field 2.073) */
  controllingAgencyId: "BISCOTST1",
  /** ebts.version */
  ebtsVersion: "4.1" as const,
  /** retention.code (Type-2 field 2.005) */
  retention: false,
  /** BioCore server, used until ABIS settings say otherwise. */
  bioCoreHost: "192.168.1.172",
  bioCorePort: "443",
  /**
   * BioCore device credential for development builds. It is a secret, so it
   * is not written here: it comes from EXPO_PUBLIC_BIOCORE_CREDENTIAL in
   * .env.local, which git ignores. Empty on a build without that file.
   */
  bioCoreCredential: process.env.EXPO_PUBLIC_BIOCORE_CREDENTIAL ?? "",
};

/** Type-1 settings with every blank filled from the defaults. */
export const resolveType1 = (
  savedSettings?: Partial<Type1Settings> | null,
): Type1Settings => {
  const saved = savedSettings ?? {};
  const pick = (value: string | undefined, fallback: string) =>
    value?.trim() ? value.trim() : fallback;
  return {
    ori: pick(saved.ori, DOD_DEFAULTS.ori),
    oan: pick(saved.oan, DOD_DEFAULTS.oan),
    dai: pick(saved.dai, DOD_DEFAULTS.dai),
    dan: pick(saved.dan, DOD_DEFAULTS.dan),
    ebtsVersion: saved.ebtsVersion ?? DOD_DEFAULTS.ebtsVersion,
  };
};
