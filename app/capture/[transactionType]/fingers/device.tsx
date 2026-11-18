import { Spinner } from "@/components/Spinner";
import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { FormButtons } from "@/components/form";
import { H2, SafeAreaView } from "@/components/themed";
import { OmitFingerDialog } from "@/features/capture/OmitFingerDialog";
import { useCaptureActions } from "@/features/capture/context/hooks";
import { mapFinger } from "@/features/capture/context/util";
import { CaptureSequence, CaptureState } from "@/features/capture/types";
import {
  captureSequence,
  fgpFromMultiple,
  sequenceForSegmentation,
} from "@/features/capture/util";
import { ExpoIdentifiView } from "@/modules/expo-identifi";
import ExpoIdentifiModule from "@/modules/expo-identifi/src/ExpoIdentifiModule";
import { tHelper } from "@/translations/translationHelper";
import {
  AmputatedOrBandaged,
  Base64Image,
  FGP,
  Finger,
  NFIQScore,
} from "@/types/BiometricData";
import { mapToFingerType } from "@/types/util";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, StyleSheet } from "react-native";

export default function DeviceCaptureScreen() {
  const { fgp: rawFgp } = useLocalSearchParams();
  const fgp: FGP | undefined =
    rawFgp && !isNaN(Number(rawFgp)) ? Number(rawFgp) : undefined;
  const [capturingAt, setCapturingAt] = useState<CaptureSequence>(0);
  const cancelled = useRef(false);
  const captureInFlight = useRef(false);
  const { setValue, getValue } = useCaptureActions();
  const { getValue: getAutofillValue } = useAutofill();
  const router = useRouter();
  const omitted = useRef<AmputatedOrBandaged[]>([]);
  const [spinnerMessage, setSpinnerMessage] = useState<string>("");
  const [omittedFingerDialogVisible, setOmittedFingerDialogVisible] =
    useState(false);

  const doCapture = useCallback(async () => {
    if (captureInFlight.current) {
      return;
    }

    captureInFlight.current = true;
    const getOmitted = (fgp: CaptureSequence) =>
      omitted.current.find(({ fingerPosition }) => fingerPosition === fgp);
    setSpinnerMessage("Preparing for capture...");
    try {
      await ExpoIdentifiModule.clearMemoryBuffer();
      await ExpoIdentifiModule.setMinimumNFIQScore(3);

      let pngFingers: CaptureState["pngFingers"] = getValue("pngFingers");
      let fingers: Finger[] = getValue("transaction.fingers");
      const { modelNumber, serialNumber } =
        await ExpoIdentifiModule.getDeviceInfo();

      const modelNumberValue = parseInt(modelNumber.match(/\d+/)?.[0] ?? "0");
      const fingerprintCaptureSequence =
        getAutofillValue("appSettings")?.fingerprintCaptureSequence;
      let sequence: CaptureSequence[] = [];
      if (fgp) {
        sequence = [fgp];
      } else if (fingerprintCaptureSequence === "twoFlat") {
        sequence = [FGP.RIGHT_INDEX, FGP.LEFT_INDEX];
      } else if (
        modelNumberValue < 45 ||
        fingerprintCaptureSequence === "tenRolled"
      ) {
        sequence = [
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
        ];
      } else if (modelNumberValue < 50) {
        sequence = [
          captureSequence.RIGHT_INDEX_AND_MIDDLE,
          captureSequence.RIGHT_RING_AND_LITTLE,
          captureSequence.LEFT_INDEX_AND_MIDDLE,
          captureSequence.LEFT_RING_AND_LITTLE,
          captureSequence.PLAIN_LEFT_AND_RIGHT_THUMBS,
        ];
      } else {
        sequence = [
          FGP.PLAIN_RIGHT_FOUR_FINGERS,
          FGP.PLAIN_LEFT_FOUR_FINGERS,
          FGP.PLAIN_LEFT_AND_RIGHT_THUMBS,
        ];
      }
      for (const [i, currentFGP] of sequence.entries()) {
        setSpinnerMessage("");
        if (cancelled.current) {
          return;
        }
        setCapturingAt(currentFGP);
        if (!getOmitted(currentFGP)) {
          try {
            await ExpoIdentifiModule.captureFingerprints(
              fgpFromMultiple[currentFGP].length,
              0,
              fingerprintCaptureSequence,
            );
          } catch (e) {
            if (fgpFromMultiple[currentFGP].length > 1) {
              await ExpoIdentifiModule.clearMemoryBuffer().catch((error) => {
                console.error(
                  "Error clearing memory buffer after retry split",
                  error,
                );
              });
              sequence.splice(i + 1, 0, ...fgpFromMultiple[currentFGP]);
              continue;
            }
            if (
              e instanceof Error &&
              e.message.includes("cancelled") &&
              cancelled.current
            ) {
              console.warn("Capture cancelled by user");
              return;
            }
            if (!fgpFromMultiple[currentFGP].some((fgp) => getOmitted(fgp))) {
              throw e;
            }
          }
        }
        if (cancelled.current) {
          return;
        }
        setSpinnerMessage(`${tHelper("processing")}`);
        for (const [j, fgp] of sequenceForSegmentation(currentFGP).entries()) {
          const fingerType = mapToFingerType(fgp);

          let nfiq: NFIQScore | undefined;
          let imageHeight: number | undefined;
          let imageWidth: number | undefined;
          let wsqImage: Base64Image | undefined;
          if (!getOmitted(fgp)) {
            try {
              const image = await ExpoIdentifiModule.getSegmentedImage(j);
              pngFingers = { ...pngFingers, [fingerType]: image };
              nfiq = await ExpoIdentifiModule.getNFIQScore(j);
              imageHeight = 800;
              imageWidth = 750;
              wsqImage = await ExpoIdentifiModule.getWSQImage(j);
            } catch (error) {
              console.error(
                `Error retrieving fingerprint segment ${j} for ${fgp}`,
                error,
              );
              await ExpoIdentifiModule.clearMemoryBuffer().catch(
                (clearError) => {
                  console.error(
                    "Error clearing memory buffer after segment failure",
                    clearError,
                  );
                },
              );
              throw error;
            }
          }

          const finger: Finger = mapFinger({
            i,
            fgp,
            imageHeight,
            imageWidth,
            image: wsqImage,
            make: "IdentiFI",
            modelNumber,
            serialNumber,
            nfiq,
            missingFingerprintsReason: getOmitted(currentFGP)?.reason,
            fingerprintCaptureSequence,
          });

          omitted.current = omitted.current.filter(
            ({ fingerPosition }) => fingerPosition !== fgp,
          );

          const fingerIndex = fingers.findIndex(
            (f) => f.fingerPosition === fgp,
          );

          if (fingerIndex === -1) {
            fingers = [...fingers, finger];
          } else {
            fingers = [...fingers];
            fingers[fingerIndex] = finger;
          }
        }
      }

      setValue("transaction.fingers", fingers);
      setValue("pngFingers", pngFingers);
      router.back();
    } catch (e) {
      setSpinnerMessage("");
      console.error("Error capturing fingerprints", e);
      await ExpoIdentifiModule.clearMemoryBuffer().catch((error) => {
        console.error(
          "Error clearing memory buffer after capture failure",
          error,
        );
      });
      Alert.alert("Error", "Failed to capture fingerprints", [
        { text: "Retry", onPress: () => doCapture() },
        { text: "Cancel", onPress: () => router.back() },
      ]);
    } finally {
      captureInFlight.current = false;
    }
  }, [fgp, getAutofillValue, getValue, router, setValue]);

  useFocusEffect(
    useCallback(() => {
      cancelled.current = false;
      doCapture();
      return () => {
        cancelled.current = true;
        ExpoIdentifiModule.stopCapture().catch((error) => {
          console.error("Error stopping capture on cleanup", error);
        });
        ExpoIdentifiModule.disconnect();
      };
    }, [doCapture]),
  );

  const handleOmit = () => {
    if (fgpFromMultiple[capturingAt].length === 1) {
      const handlePress = (reason: AmputatedOrBandaged["reason"]) => {
        omitted.current.push({
          reason,
          fingerPosition: capturingAt as FGP,
        });
        ExpoIdentifiModule.stopCapture();
      };

      Alert.alert(tHelper("omitFingerImage"), tHelper("omitReason"), [
        {
          text: tHelper("amputated"),
          onPress: () => {
            handlePress("XX");
          },
        },
        {
          text: tHelper("bandaged"),
          onPress: () => {
            handlePress("UP");
          },
        },
        { text: tHelper("cancel"), style: "cancel" },
      ]);
    } else {
      setOmittedFingerDialogVisible(true);
    }
  };

  const handleOmissionSubmit = (omittedFingers: AmputatedOrBandaged[]) => {
    omitted.current = [...omitted.current, ...omittedFingers];
    setOmittedFingerDialogVisible(false);
    ExpoIdentifiModule.stopCapture();
  };

  const handleCancel = async () => {
    cancelled.current = true;
    try {
      await ExpoIdentifiModule.stopCapture();
    } catch (e) {
      console.error("Error stopping capture", e);
    }
    router.back();
  };

  const closeOmittedFingerDialog = () => {
    setOmittedFingerDialogVisible(false);
  };

  return (
    <SafeAreaView style={StyleSheet.absoluteFill}>
      {spinnerMessage && <Spinner message={spinnerMessage} />}
      <H2 style={styles.text}>
        {tHelper("place")} {tHelper(`${capturingAt}`)} {tHelper("onScanner")}
      </H2>
      <ExpoIdentifiView style={styles.view} />
      <FormButtons
        onCancel={handleCancel}
        cancelText={tHelper("cancelCapture")}
        onSubmit={handleOmit}
        submitText={`${tHelper("omit")} ${capturingAt > 12 ? tHelper("finger") : tHelper(`${capturingAt}`)}`}
      />
      <OmitFingerDialog
        captureSequence={capturingAt}
        onSubmit={handleOmissionSubmit}
        toggle={closeOmittedFingerDialog}
        visible={omittedFingerDialogVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  view: {
    flex: 1,
  },
  text: {
    textAlign: "center",
    marginVertical: 10,
    // flex: 1,
  },
  buttons: {},
});
