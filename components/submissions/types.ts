import { FaceDTO, Transaction } from "@/types";

export interface Sensor {
  srf: string;
  dateProcessed: string;
  tcn: string;
  eid: string;
  source: string;
  ori: string;
  name: string;
  pob: string;
  dob: string;
  sex: string;
  race: string;
  height: string;
  weight: string;
  eyeColor: string;
  hairColor: string;
  imageType: string;
  faceImage: string;
  derog: string;
}

export interface SubmissionDTO {
  dateTime: string | null;
  remark: string | null;
  sensors: Sensor[] | null;
  respository: string | null;
  type: number | null;
}

export interface SubmissionItem extends Transaction, Partial<SubmissionDTO> {
  fetching?: boolean;
  failed: boolean;
  thumbnail?: FaceDTO;
  error?: unknown;
  pending?: boolean;
  thumbnailReference?: FaceDTO;
  elapsedTime?: string;
  awaitingConfirmation?: boolean;
  lastSubmissionAttemptAt?: string;
  submissionAttempts?: number;
  lastResponseFetchAt?: string;
  noMatchPollingStartedAt?: string;
  responseErrorReason?: string;
}
