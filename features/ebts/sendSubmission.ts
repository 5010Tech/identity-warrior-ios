import { logEvent } from "@/util/fieldLog";
import {
  BioCoreState,
  checkBioCoreStatus,
  getBioCoreConfig,
  submitToBioCore,
} from "./bioCore";
import { getNrtioConfig, NrtioState, submitToNrtio } from "./nrtio";
import { DodSubmission, readSubmissionFile, updateSubmission } from "./vault";

const listeners = new Set<() => void>();
/** Calls back whenever a transaction's BioCore state has been updated. */
export const watchSubmissions = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const changed = () => listeners.forEach((listener) => listener());

/** Keeps the NRTIO outcome on the transaction's card. */
const recordNrtio = async (
  submission: DodSubmission,
  nrtio: NrtioState,
): Promise<DodSubmission> => {
  const updated = { ...submission, nrtio };
  await updateSubmission(updated).catch(() => undefined);
  changed();
  return updated;
};

/**
 * What a card says about where its transaction went: the label, whether that
 * is good, bad or still under way, the failure reason, and whether it has
 * been delivered (so Resubmit is no longer offered).
 */
export const deliveryOf = ({ bioCore, nrtio }: DodSubmission) => {
  if (nrtio) {
    return {
      label: {
        sending: "nrtioSending",
        sent: "nrtioSent",
        failed: "nrtioFailed",
      }[nrtio.status] as "nrtioSending" | "nrtioSent" | "nrtioFailed",
      tone:
        nrtio.status === "failed"
          ? ("bad" as const)
          : nrtio.status === "sending"
            ? ("pending" as const)
            : ("good" as const),
      error: nrtio.status === "failed" ? nrtio.error : undefined,
      delivered: nrtio.status === "sent",
    };
  }
  if (bioCore) {
    return {
      label: {
        sending: "bioCoreSending",
        sent: "bioCoreSent",
        completed: "bioCoreCompleted",
        failed: "bioCoreFailed",
      }[bioCore.status] as
        | "bioCoreSending"
        | "bioCoreSent"
        | "bioCoreCompleted"
        | "bioCoreFailed",
      tone:
        bioCore.status === "failed"
          ? ("bad" as const)
          : bioCore.status === "sending"
            ? ("pending" as const)
            : ("good" as const),
      error: bioCore.status === "failed" ? bioCore.error : undefined,
      delivered: bioCore.status === "sent" || bioCore.status === "completed",
    };
  }
  return null;
};

/**
 * Sends a stored transaction to the ABIS chosen in settings (NRTIO or
 * BioCore) and records the outcome on its card. Never throws: a failure is
 * kept on the card, where Resubmit tries again.
 */
export const sendSubmission = async (
  submission: DodSubmission,
): Promise<DodSubmission> => {
  // NRTIO, when that is the ABIS in settings.
  let nrtioConfig: Awaited<ReturnType<typeof getNrtioConfig>> = null;
  try {
    nrtioConfig = await getNrtioConfig();
  } catch (error) {
    return recordNrtio(submission, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
  if (nrtioConfig) {
    await recordNrtio(submission, { status: "sending" });
    try {
      return await recordNrtio(
        submission,
        await submitToNrtio(
          nrtioConfig,
          submission.tcn,
          await readSubmissionFile(submission.tcn),
        ),
      );
    } catch (error) {
      logEvent("nrtio", "submission failed", error);
      return recordNrtio(submission, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  let bioCore: BioCoreState;
  try {
    const config = await getBioCoreConfig();
    if (!config) return submission; // another ABIS, or none
    await updateSubmission({
      ...submission,
      bioCore: { ...submission.bioCore, status: "sending" },
    });
    changed();
    bioCore = await submitToBioCore(
      config,
      submission.tcn,
      await readSubmissionFile(submission.tcn),
    );
  } catch (error) {
    logEvent("biocore", "submission failed", error);
    bioCore = {
      ...submission.bioCore,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const updated = { ...submission, bioCore };
  await updateSubmission(updated).catch(() => undefined);
  changed();
  return updated;
};

/** Asks BioCore about a sent transaction; returns it updated if that changed. */
export const refreshSubmission = async (
  submission: DodSubmission,
): Promise<DodSubmission> => {
  if (submission.bioCore?.status !== "sent") return submission;
  try {
    const config = await getBioCoreConfig();
    if (!config) return submission;
    const bioCore = await checkBioCoreStatus(config, submission.bioCore);
    if (bioCore === submission.bioCore) return submission;
    const updated = { ...submission, bioCore };
    await updateSubmission(updated);
    return updated;
  } catch (error) {
    logEvent("biocore", "status check failed", error);
    return submission;
  }
};
