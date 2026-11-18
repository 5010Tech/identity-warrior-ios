export interface AppSettings {
  retainLogsDays: number;
  retainSubmissionsDays: number;
  contactlessAdministered: boolean;
  fingerprintCaptureSequence: fingerprintCaptureSequence;
}

export type fingerprintCaptureSequence = "tenFlat" | "twoFlat" | "tenRolled";
