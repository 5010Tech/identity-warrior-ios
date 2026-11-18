import { BiographicData } from "./BiographicData";
import { FaceDTO, Finger, Iris } from "./BiometricData";

export type TransactionType = "Enroll" | "Verify" | "Identify" | "Compare";

export interface SubmissionSettings {
  ori: string;
  oan: string;
  dai: string;
  dan: string;
  cai: string;
  on: string;
  ou: string;
  osu: string;
  activitySiteId: string;
  activityCategory: string;
  activityTerminal: string;
}

export interface Transaction extends SubmissionSettings {
  tot: TransactionType;
  transactionDate: Date | null;
  geoLocation: string;
  tcn: string;
  applicationName: string;
  applicationVersion: string;
  biographicData: BiographicData;
  faces: FaceDTO[];
  fingers: Finger[];
  irises: Iris[];
}
