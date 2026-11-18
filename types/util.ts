import { FingerType } from "@/modules/slapshot-capture-library/src";
import { FGP, Iris, IrisEyePosition } from "./BiometricData";

export const mapToFGP = (fingerType: FingerType): FGP => {
  const fingerTypeMap: { [key in FingerType]: keyof typeof FGP } = {
    [FingerType.UNKNOWN]: "UNKNOWN",
    [FingerType.RT]: "RIGHT_THUMB",
    [FingerType.RI]: "RIGHT_INDEX",
    [FingerType.RM]: "RIGHT_MIDDLE",
    [FingerType.RR]: "RIGHT_RING",
    [FingerType.RL]: "RIGHT_LITTLE",
    [FingerType.LT]: "LEFT_THUMB",
    [FingerType.LI]: "LEFT_INDEX",
    [FingerType.LM]: "LEFT_MIDDLE",
    [FingerType.LR]: "LEFT_RING",
    [FingerType.LL]: "LEFT_LITTLE",
    [FingerType.PRT]: "PLAIN_RIGHT_THUMB",
    [FingerType.PLT]: "PLAIN_LEFT_THUMB",
    [FingerType.R4FS]: "PLAIN_RIGHT_FOUR_FINGERS",
    [FingerType.L4FS]: "PLAIN_LEFT_FOUR_FINGERS",
    [FingerType.TS]: "PLAIN_LEFT_AND_RIGHT_THUMBS",
  };

  return FGP[fingerTypeMap[fingerType]];
};

export const mapToFingerType = (fgp: FGP): FingerType =>
  [
    FingerType.UNKNOWN,
    FingerType.RT,
    FingerType.RI,
    FingerType.RM,
    FingerType.RR,
    FingerType.RL,
    FingerType.LT,
    FingerType.LI,
    FingerType.LM,
    FingerType.LR,
    FingerType.LL,
    FingerType.PRT,
    FingerType.PLT,
    FingerType.R4FS,
    FingerType.L4FS,
    FingerType.TS,
  ][fgp];

export const mapIrisEyePositionToCode = (
  eyePosition: IrisEyePosition,
): number => (eyePosition === "right" ? 1 : 2);

export const hasMissingIrisReason = (
  iris?: Pick<Iris, "missingIris" | "missingIrises"> | null,
) => Boolean(iris?.missingIris?.reason || iris?.missingIrises?.length);
