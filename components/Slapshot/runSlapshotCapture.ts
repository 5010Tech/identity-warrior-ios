import {
  SlapshotCaptureError,
  CaptureError,
  EncodingType,
  FpCondition,
} from "@/modules/slapshot-capture-library/src";
import { FGP, Finger, fingerprintCaptureSequence, NFIQScore } from "@/types";
import { mapToFGP, mapToFingerType } from "@/types/util";
import { Alert } from "react-native";
import { SlapshotCaptureViewModel } from "./SlapshotCaptureViewModel";

import { logger } from "react-native-logs";
import { CaptureActions } from "@/features/capture/context/hooks";
import { mapFinger } from "@/features/capture/context/util";

export const runSlapshotCapture = async (
  viewModel: SlapshotCaptureViewModel,
  setValue: CaptureActions["setValue"],
  fingerPosition?: FGP,
  fingerIndex?: number,
  fingerprintCaptureSequence?: fingerprintCaptureSequence,
) => {
  if (fingerprintCaptureSequence === "tenRolled") {
    Alert.alert(
      "Not Supported",
      "Identity Warrior does not support contactless rolled capture. Please connect a device, or update app settings to use a different capture sequence.",
    );
    return;
  }
  const log = logger.createLogger();
  const capturedResult = await (fingerPosition
    ? viewModel.captureSingleFinger(mapToFingerType(fingerPosition))
    : viewModel.captureBiometricsAdministered(
        false,
        fingerprintCaptureSequence,
      ));
  try {
    if (SlapshotCaptureError.isError(capturedResult)) {
      if (capturedResult.captureError !== CaptureError.Cancelled) {
        Alert.alert("Slapshot Capture Biometrics Error", capturedResult.error, [
          {
            text: "Close",
            onPress: () => {
              viewModel.completeExportIdentity();
            },
          },
        ]);
      }

      viewModel.failCaptureBiometrics();

      return;
    }
    const imageData = await viewModel.exportIdentity(capturedResult);
    const pngImageData = await viewModel.exportIdentity(
      capturedResult,
      EncodingType.Png,
    );
    if (
      SlapshotCaptureError.isError(imageData) ||
      SlapshotCaptureError.isError(pngImageData)
    ) {
      throw new Error("Failed to export biometric data");
    }

    if (fingerPosition && fingerIndex !== undefined) {
      const wsqFinger = imageData.fingerprints[0];
      const pngFingerBase64 = pngImageData.fingerprints[0];

      wsqFinger &&
        setValue<Finger>(
          `transaction.fingers[${fingerIndex}]`,
          mapFinger({
            i: fingerIndex,
            fgp: fingerPosition,
            modelNumber: "",
            serialNumber: "",
            make: "Slapshot",
            nfiq: wsqFinger.qualityScore?.quality as NFIQScore,
            image: wsqFinger.image?.imageBytesBase64,
            imageHeight: wsqFinger.image?.height,
            imageWidth: wsqFinger.image?.width,
            missingFingerprintsReason:
              wsqFinger.condition === FpCondition.Normal ? undefined : "XX",
          }),
        );

      pngFingerBase64 &&
        setValue(
          `pngFingers.${mapToFingerType(fingerPosition)}`,
          pngFingerBase64.image?.imageBytesBase64,
        );
    } else {
      imageData &&
        setValue(
          "transaction.fingers",
          imageData.fingerprints.map<Finger>(
            ({ image, fingerType, qualityScore, condition }, i) =>
              mapFinger({
                image: image?.imageBytesBase64,
                imageHeight: image?.height,
                imageWidth: image?.width,
                i,
                nfiq: qualityScore?.quality as NFIQScore,
                fgp: mapToFGP(fingerType),
                modelNumber: "",
                serialNumber: "",
                make: "Slapshot",
                missingFingerprintsReason:
                  condition === FpCondition.Normal ? undefined : "XX",
              }),
          ),
        );
      pngImageData &&
        setValue(
          "pngFingers",
          pngImageData.fingerprints.reduce(
            (acc, { image, fingerType }) => ({
              ...acc,
              [fingerType]: image?.imageBytesBase64,
            }),
            {},
          ),
        );
    }
  } catch (e) {
    log.error("Slapshot - captureBiometricsAsync error: " + e);
    viewModel.failCaptureBiometrics();
  } finally {
    viewModel.completeExportIdentity();
  }
};
