import { fingerprintCaptureSequence, Pose } from "@/types";
import { FGP, Finger, IMP, Iris, IrisEyePosition } from "@/types/BiometricData";
import { AdditionalFGP, CaptureSequence } from "./types";
import openSettings from "@/util/openNetworkSettings";
import { Alert } from "react-native";
import { ExpoNeoScanModule } from "@/modules/expo-neo-scan";
import { SetValueFn } from "./context/CaptureProvider";
import { mapFinger } from "./context/util";
import { hasMissingIrisReason, mapToFingerType } from "@/types/util";

export const captureSequence = { ...FGP, ...AdditionalFGP };

export const poseNames: { [key in Pose]: string } = {
  F: "Frontal Face",
  L: "Left Profile (Optional)",
  R: "Right Profile (Optional)",
  LA: "Left Angled Face (Optional)",
  RA: "Right Angled Face (Optional)",
};

export const fingerPositionNames: { [key in CaptureSequence]: string } = {
  [FGP.UNKNOWN]: "Unknown",
  [FGP.RIGHT_THUMB]: "Right Thumb",
  [FGP.RIGHT_INDEX]: "Right Index",
  [FGP.RIGHT_MIDDLE]: "Right Middle",
  [FGP.RIGHT_RING]: "Right Ring",
  [FGP.RIGHT_LITTLE]: "Right Little",
  [FGP.LEFT_THUMB]: "Left Thumb",
  [FGP.LEFT_INDEX]: "Left Index",
  [FGP.LEFT_MIDDLE]: "Left Middle",
  [FGP.LEFT_RING]: "Left Ring",
  [FGP.LEFT_LITTLE]: "Left Little",
  [FGP.PLAIN_RIGHT_THUMB]: "Right Thumb",
  [FGP.PLAIN_LEFT_THUMB]: "Left Thumb",
  [FGP.PLAIN_RIGHT_FOUR_FINGERS]: "Right Four Fingers",
  [FGP.PLAIN_LEFT_FOUR_FINGERS]: "Left Four Fingers",
  [FGP.PLAIN_LEFT_AND_RIGHT_THUMBS]: "Both Thumbs",
  [AdditionalFGP.RIGHT_INDEX_AND_MIDDLE]: "Right Index and Middle",
  [AdditionalFGP.RIGHT_RING_AND_LITTLE]: "Right Ring and Little",
  [AdditionalFGP.LEFT_INDEX_AND_MIDDLE]: "Left Index and Middle",
  [AdditionalFGP.LEFT_RING_AND_LITTLE]: "Left Ring and Little",
};

export const fgpFromMultiple: {
  [key in CaptureSequence]: [FGP] | [FGP, FGP] | [FGP, FGP, FGP, FGP];
} = {
  [FGP.UNKNOWN]: [FGP.UNKNOWN],
  [FGP.RIGHT_THUMB]: [FGP.RIGHT_THUMB],
  [FGP.RIGHT_INDEX]: [FGP.RIGHT_INDEX],
  [FGP.RIGHT_MIDDLE]: [FGP.RIGHT_MIDDLE],
  [FGP.RIGHT_RING]: [FGP.RIGHT_RING],
  [FGP.RIGHT_LITTLE]: [FGP.RIGHT_LITTLE],
  [FGP.LEFT_THUMB]: [FGP.LEFT_THUMB],
  [FGP.LEFT_INDEX]: [FGP.LEFT_INDEX],
  [FGP.LEFT_MIDDLE]: [FGP.LEFT_MIDDLE],
  [FGP.LEFT_RING]: [FGP.LEFT_RING],
  [FGP.LEFT_LITTLE]: [FGP.LEFT_LITTLE],
  [FGP.PLAIN_RIGHT_THUMB]: [FGP.PLAIN_RIGHT_THUMB],
  [FGP.PLAIN_LEFT_THUMB]: [FGP.PLAIN_LEFT_THUMB],
  [FGP.PLAIN_RIGHT_FOUR_FINGERS]: [
    FGP.RIGHT_INDEX,
    FGP.RIGHT_MIDDLE,
    FGP.RIGHT_RING,
    FGP.RIGHT_LITTLE,
  ],
  [FGP.PLAIN_LEFT_FOUR_FINGERS]: [
    FGP.LEFT_INDEX,
    FGP.LEFT_MIDDLE,
    FGP.LEFT_RING,
    FGP.LEFT_LITTLE,
  ],
  [FGP.PLAIN_LEFT_AND_RIGHT_THUMBS]: [FGP.LEFT_THUMB, FGP.RIGHT_THUMB],
  [AdditionalFGP.RIGHT_INDEX_AND_MIDDLE]: [FGP.RIGHT_INDEX, FGP.RIGHT_MIDDLE],
  [AdditionalFGP.RIGHT_RING_AND_LITTLE]: [FGP.RIGHT_RING, FGP.RIGHT_LITTLE],
  [AdditionalFGP.LEFT_INDEX_AND_MIDDLE]: [FGP.LEFT_INDEX, FGP.LEFT_MIDDLE],
  [AdditionalFGP.LEFT_RING_AND_LITTLE]: [FGP.LEFT_RING, FGP.LEFT_LITTLE],
};

const LEFT_HAND_FGPS = new Set<FGP>([
  FGP.LEFT_THUMB,
  FGP.LEFT_INDEX,
  FGP.LEFT_MIDDLE,
  FGP.LEFT_RING,
  FGP.LEFT_LITTLE,
]);

export function sequenceForSegmentation<
  T extends [FGP] | [FGP, FGP] | [FGP, FGP, FGP, FGP],
>(sequence: CaptureSequence): T {
  const multiple = fgpFromMultiple[sequence];
  if (multiple.some((fgp) => LEFT_HAND_FGPS.has(fgp))) {
    return [...multiple].reverse() as T;
  }
  return multiple as T;
}

export const runBTCapture = async (
  setLoadingMessage: (message: string) => void,
  setValue: SetValueFn,
  fgp?: FGP,
  fingerIndex?: number,
  fingerprintCaptureSequence?: fingerprintCaptureSequence,
) => {
  setLoadingMessage("Setting up fingerprint capture...");
  try {
    await ExpoNeoScanModule.setCaptureSequence(
      fgp ? [fgp] : arrayFromSequence(fingerprintCaptureSequence || "tenFlat"),
      fingerprintCaptureSequence === "tenRolled"
        ? IMP.LIVE_SCAN_ROLLED
        : IMP.LIVE_SCAN_PLAIN,
    );
  } catch (error) {
    console.error(error);
    await ExpoNeoScanModule.disconnect();
    Alert.alert(
      "Error",
      "Failed to set capture sequence. Please make sure the device is connected and try again.",
      [
        {
          text: "Bluetooth Settings",
          onPress: () => openSettings("Bluetooth"),
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
    return;
  } finally {
    setLoadingMessage("");
  }
  Alert.alert(
    "Capture Fingerprints",
    `Please follow the LED indicators on your device to complete fingerprint capture. Tap Done once all fingerprints have been captured.${fgp ? " Press Omit if you are unable to capture this fingerprint." : ""}`,
    [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => {
          ExpoNeoScanModule.disconnect();
        },
      },
      ...(fgp
        ? [
            {
              text: "Omit",
              onPress: () => {
                ExpoNeoScanModule.disconnect();
                Alert.alert(
                  "Omit Finger Image",
                  "Please select the reason for omission",
                  [
                    {
                      text: "Amputated",
                      onPress: () => {
                        fingerIndex !== undefined &&
                          setValue(
                            `transaction.fingers[${fingerIndex}]`,
                            mapFinger({
                              image: "",
                              imageHeight: 750,
                              imageWidth: 800,
                              i: fingerIndex ?? 0,
                              fgp,
                              modelNumber: "",
                              serialNumber: "",
                              make: "",
                              missingFingerprintsReason: "XX",
                            }),
                          );
                        setValue(`pngFingers.${mapToFingerType(fgp)}`, "");
                      },
                    },
                    {
                      text: "Bandaged",
                      onPress: () => {
                        fingerIndex !== undefined &&
                          setValue(
                            `transaction.fingers[${fingerIndex}]`,
                            mapFinger({
                              image: "",
                              imageHeight: 750,
                              imageWidth: 800,
                              i: fingerIndex ?? 0,
                              fgp,
                              modelNumber: "",
                              serialNumber: "",
                              make: "",
                              missingFingerprintsReason: "UP",
                            }),
                          );
                      },
                    },
                    { text: "Cancel", style: "cancel" as "cancel" },
                  ],
                );
              },
              style: "destructive" as "destructive",
            },
          ]
        : []),
      {
        text: "Done",
        onPress: async () => {
          try {
            setLoadingMessage("Retrieving fingerprint images...");
            const { manufacturer, modelNumber, serialNumber } =
              await ExpoNeoScanModule.getDeviceInfo();
            const imageList = await ExpoNeoScanModule.getImageList();
            if (!imageList || imageList.length === 0) {
              ExpoNeoScanModule.disconnect();
              Alert.alert(
                "No Fingerprints Captured",
                "No fingerprints were retrieved from the device. Try again, and ensure that you have collected all fingerprints before pressing Done.",
                [{ text: "Close" }],
              );
              return;
            }
            const images = await ExpoNeoScanModule.getImages(imageList);
            const fingers: Finger[] = images.map(({ wsqBase64, fgp }, i) => {
              return mapFinger({
                image: wsqBase64,
                imageHeight: 750,
                imageWidth: 800,
                i,
                fgp,
                modelNumber,
                serialNumber,
                make: manufacturer,
                missingFingerprintsReason: undefined,
                fingerprintCaptureSequence,
              });
            });

            if (fgp && fingerIndex !== undefined) {
              setValue<Finger>(
                `transaction.fingers[${fingerIndex}]`,
                fingers[0],
              );
              setValue(
                `pngFingers.${mapToFingerType(fgp)}`,
                images[0].previewBase64,
              );
            } else {
              const pngFingers = images.reduce(
                (acc, { previewBase64, fgp }) => ({
                  ...acc,
                  [mapToFingerType(fgp)]: previewBase64,
                }),
                {},
              );
              setValue("transaction.fingers", fingers);
              setValue("pngFingers", pngFingers);
            }
          } catch (error) {
            console.error("Error retrieving fingerprints:", error);
            Alert.alert(
              "Error",
              "Failed to retrieve fingerprint images. Please try again.",
              [
                {
                  text: "Bluetooth Settings",
                  onPress: () => openSettings("Bluetooth"),
                },
                { text: "Cancel", style: "cancel" },
              ],
            );
          } finally {
            setLoadingMessage("");
            ExpoNeoScanModule.disconnect();
          }
        },
      },
    ],
  );
};

export const arrayFromSequence = (
  fingerprintCaptureSequenceSetting: fingerprintCaptureSequence,
) => {
  const values: Record<fingerprintCaptureSequence, FGP[]> = {
    tenFlat: [
      FGP.RIGHT_INDEX,
      FGP.RIGHT_MIDDLE,
      FGP.RIGHT_RING,
      FGP.RIGHT_LITTLE,
      FGP.LEFT_INDEX,
      FGP.LEFT_MIDDLE,
      FGP.LEFT_RING,
      FGP.LEFT_LITTLE,
      FGP.RIGHT_THUMB,
      FGP.LEFT_THUMB,
    ],
    twoFlat: [FGP.RIGHT_INDEX, FGP.LEFT_INDEX],
    tenRolled: [
      FGP.RIGHT_INDEX,
      FGP.RIGHT_MIDDLE,
      FGP.RIGHT_RING,
      FGP.RIGHT_LITTLE,
      FGP.LEFT_INDEX,
      FGP.LEFT_MIDDLE,
      FGP.LEFT_RING,
      FGP.LEFT_LITTLE,
      FGP.RIGHT_THUMB,
      FGP.LEFT_THUMB,
    ],
  };
  return values[fingerprintCaptureSequenceSetting];
};

export const requiredEyes: IrisEyePosition[] = ["left", "right"];
export const missingReason = "UNABLE_TO_CAPTURE" as const;

export const supportsIrisCapture = (modelNumber?: string) =>
  Boolean(modelNumber && /(?:45i|50i)/i.test(modelNumber));

export const upsertIrises = (existing: Iris[], incoming: Iris[]) => {
  const incomingMap = new Map(incoming.map((iris) => [iris.eyePosition, iris]));
  const retained = existing.filter(
    (iris) => !incomingMap.has(iris.eyePosition),
  );

  return [...retained, ...incoming].sort((a, b) =>
    a.eyePosition.localeCompare(b.eyePosition),
  );
};

export const isIrisComplete = (irises: Iris[]) =>
  requiredEyes.every((eyePosition) => {
    const iris = irises.find((item) => item.eyePosition === eyePosition);
    return Boolean(iris?.image || hasMissingIrisReason(iris));
  });
