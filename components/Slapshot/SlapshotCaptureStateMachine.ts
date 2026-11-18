import { setup } from "xstate";

export function isSlapshotCaptureState(
  value: string | null,
): value is SlapshotCaptureStates {
  return (
    !!value &&
    Object.values(SlapshotCaptureStates).includes(
      value as SlapshotCaptureStates,
    )
  );
}

export enum SlapshotCaptureStates {
  Inactive = "inactive",
  ReturnedFromSlapshot = "returnedFromSlapshot",
  NotCalibrated = "notCalibrated",
  Calibrated = "calibrated",
  Calibrating = "calibrating",
  ValidatingCalibration = "validatingCalibration",
  CapturingSelf = "capturingSelf",
  CapturingAdministered = "capturingAdministered",
  Exporting = "exporting",
  FailedToInitialize = "failedToInitialize",
}

export const doesStateUseSlapshotUI = (
  state: SlapshotCaptureStates,
): boolean => {
  return (
    state == SlapshotCaptureStates.Calibrating ||
    state == SlapshotCaptureStates.ValidatingCalibration ||
    state == SlapshotCaptureStates.CapturingSelf ||
    state == SlapshotCaptureStates.CapturingAdministered
  );
};

export const slapshotCaptureStateMachine = setup({
  types: {
    events: {} as
      | { type: "CALIBRATED" }
      | { type: "NOT_CALIBRATED" }
      | { type: "CALIBRATING" }
      | { type: "VALIDATING_CALIBRATION" }
      | { type: "CALIBRATION_COMPLETE" }
      | { type: "CAPTURING_SELF" }
      | { type: "CAPTURING_ADMINISTERED" }
      | { type: "CAPTURE_COMPLETE_FAILURE" }
      | { type: "EXPORTING" }
      | { type: "EXPORT_COMPLETE" }
      | { type: "INITIALIZATION_FAILED" },
  },
}).createMachine({
  id: "slapshotCapture",
  initial: SlapshotCaptureStates.Inactive,
  states: {
    inactive: {
      on: {
        CALIBRATED: SlapshotCaptureStates.Calibrated,
        NOT_CALIBRATED: SlapshotCaptureStates.NotCalibrated,
        INITIALIZATION_FAILED: SlapshotCaptureStates.FailedToInitialize,
      },
    },
    returnedFromSlapshot: {
      on: {
        CALIBRATED: SlapshotCaptureStates.Calibrated,
        NOT_CALIBRATED: SlapshotCaptureStates.NotCalibrated,
      },
    },
    notCalibrated: {
      on: {
        CALIBRATING: SlapshotCaptureStates.Calibrating,
        CAPTURING_SELF: SlapshotCaptureStates.CapturingSelf,
        CAPTURING_ADMINISTERED: SlapshotCaptureStates.CapturingAdministered,
      },
    },
    calibrated: {
      on: {
        CALIBRATING: SlapshotCaptureStates.Calibrating,
        VALIDATING_CALIBRATION: SlapshotCaptureStates.ValidatingCalibration,
        CAPTURING_SELF: SlapshotCaptureStates.CapturingSelf,
        CAPTURING_ADMINISTERED: SlapshotCaptureStates.CapturingAdministered,
      },
    },
    calibrating: {
      on: {
        CALIBRATION_COMPLETE: SlapshotCaptureStates.ReturnedFromSlapshot,
      },
    },
    validatingCalibration: {
      on: {
        CALIBRATION_COMPLETE: SlapshotCaptureStates.ReturnedFromSlapshot,
      },
    },
    capturingSelf: {
      on: {
        EXPORTING: SlapshotCaptureStates.Exporting,
        CAPTURE_COMPLETE_FAILURE: SlapshotCaptureStates.ReturnedFromSlapshot,
      },
    },
    capturingAdministered: {
      on: {
        EXPORTING: SlapshotCaptureStates.Exporting,
        CAPTURE_COMPLETE_FAILURE: SlapshotCaptureStates.ReturnedFromSlapshot,
      },
    },
    exporting: {
      on: {
        EXPORT_COMPLETE: SlapshotCaptureStates.ReturnedFromSlapshot,
      },
    },
    failedToInitialize: {
      on: {},
    },
  },
});
