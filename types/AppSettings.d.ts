export interface AppSettings {
  retainLogsDays: number;
  retainSubmissionsDays: number;
  /** Days an exported (decrypted) .eft file is kept. 2 when unset. */
  retainExportsDays?: number;
  /** Selfie Mode: front camera for face, self capture for contactless. */
  selfieMode?: boolean;
  fingerprintCaptureSequence: fingerprintCaptureSequence;
  /** Dark Mode switch (App Settings). Dark when unset. */
  darkMode?: boolean;
  /** Which kind of collection the app is set up for. DoD when unset. */
  collectionMode?: CollectionMode;
  /** DoD mode: slap order. 4-4-2 when unset. */
  dodFingerSequence?: DodFingerSequence;
  /** DoD mode: walk through the hands automatically, or tap each one. Manual when unset. */
  dodFingerCaptureMode?: DodFingerCaptureMode;
  /** DoD mode: allow contactless palm collection. Off when unset. */
  allowContactlessPalm?: boolean;
  /** Which hand is captured first (both modes). Right when unset. */
  startingHand?: StartingHand;
}

/** 4-4-2: four fingers, four fingers, both thumbs. 4-1-4-1: four fingers then thumb, per hand. */
export type DodFingerSequence = "4-4-2" | "4-1-4-1";
export type DodFingerCaptureMode = "manual" | "automatic";
export type StartingHand = "Left" | "Right";

/** DoD collections (EBTS to a DoD ABIS) or DHS collections (JSON to the IXM server). */
export type CollectionMode = "DOD" | "DHS";

/**
 * DoD ABIS connection (Settings > DoD ABIS). Passwords and the BioCore device
 * credential are kept in SecureStore, not here.
 */
export interface AbisSettings {
  system: AbisSystem;
  nrtioHost: string;
  nrtioPort: string;
  nrtioAccount: string;
  /** Accept the NRTIO mail server's certificate as it is. */
  nrtioAllowSelfSigned?: boolean;
  sftpHost: string;
  sftpPort: string;
  sftpAccount: string;
  bioCoreHost: string;
  bioCorePort: string;
  /** Skip certificate verification for BioCore connections. */
  bioCoreAllowSelfSigned?: boolean;
}

/** DoD Type-1 transaction metadata (Settings > Type-1). */
export interface Type1Settings {
  ori: string;
  oan: string;
  dai: string;
  dan: string;
  ebtsVersion: "4.1" | "NATO";
}

/** DoD Type-2 default biographic values (Settings > Type-2). */
export interface Type2Settings {
  givenName: string;
  surname: string;
  sex: string;
  height: string;
  weight: string;
  eyeColor: string;
  hairColor: string;
  race: string;
  /** ISO date. */
  dob?: string | null;
  birthCountry: string;
  citizenship: string;
  personnelType: string;
  collectionReason: string;
  dnaSystem: string;
}

/** Where DoD transactions are sent (Android portal_array). */
export type AbisSystem = "NONE" | "NRTIO" | "SFTP" | "BIOCORE";

export type fingerprintCaptureSequence = "tenFlat" | "twoFlat" | "tenRolled";
