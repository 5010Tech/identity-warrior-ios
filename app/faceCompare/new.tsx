import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { FormButtons } from "@/components/form";
import { useSlapshotContext } from "@/components/Slapshot/SlapshotContext";
import { Spinner } from "@/components/Spinner";
import { useSubmissionActions } from "@/components/submissions";
import { SafeAreaView, View } from "@/components/themed";
import { useAllowCamera } from "@/components/useAllowCamera";
import {
  CaptureError,
  SlapshotCaptureError,
  SlapshotCaptureView,
} from "@/modules/slapshot-capture-library/src";
import { FaceDTO, Transaction } from "@/types";
import { deleteFileOrDirectory, saveBase64Image } from "@/util/fs";
import { scaleRelative } from "@/util/scaleRelative";
import { EncodingType } from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import {
  ImagePickerOptions,
  ImagePickerResult,
  launchCameraAsync,
  launchImageLibraryAsync,
  MediaTypeOptions,
} from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { tHelper } from "../../translations/translationHelper";
import { AddImageButton } from "../../features/faceCompare/AddImageButton";
import {
  OFIQResults,
  ImageDetails,
  processImage,
} from "@/features/ofiq/OFIQCalculator";

export default function NewFaceCompareScreen() {
  const [probe, setProbe] = useState<FaceDTO | undefined>(undefined);
  const [reference, setReference] = useState<FaceDTO | undefined>(undefined);
  const [spinnerText, setSpinnerText] = useState<string | undefined>(undefined);
  const viewModel = useSlapshotContext();
  const cameraPermission = useAllowCamera("/faceCompare");
  const router = useRouter();
  const { getValue, createTCN } = useAutofill();
  const { addSubmission } = useSubmissionActions();

  if (!viewModel || !cameraPermission?.granted) {
    return <Spinner />;
  }

  const captureFace = async () => {
    const capturedResult = await viewModel.captureBiometricsAdministered(true);
    try {
      if (SlapshotCaptureError.isError(capturedResult)) {
        if (capturedResult.captureError !== CaptureError.Cancelled) {
          Alert.alert(tHelper("slapshotCaptureErr"), capturedResult.error, [
            {
              text: tHelper("close"),
              onPress: () => {
                viewModel.completeExportIdentity();
              },
            },
          ]);
        }

        viewModel.failCaptureBiometrics();

        return;
      }
      setSpinnerText(tHelper("savingImage"));
      const imageData = await viewModel.exportIdentity(capturedResult);
      if (SlapshotCaptureError.isError(imageData)) {
        throw new Error(`Failed to export biometric data: ${imageData.error}`);
      }

      const image = imageData?.faces?.[0]?.image;
      if (image) {
        let filePath = await saveBase64Image(
          image.imageBytesBase64,
          `ofiq.jpg`,
          EncodingType.Base64,
        );
        await ImageManipulator.manipulateAsync(
          filePath,
          [{ resize: { width: 1000, height: 1000 } }],
          { format: ImageManipulator.SaveFormat.JPEG },
        );
        let ofiqResults: OFIQResults | undefined;
        if (filePath) {
          const currentImage: ImageDetails = {
            path: filePath,
            width: 1000,
            height: 1000,
          };
          ofiqResults = await processImage(currentImage);
          await deleteFileOrDirectory("ofiq.jpg");
        }
        setProbe({
          referenceId: `probe-${Date.now()}`,
          image: image.imageBytesBase64,
          imageHeight: image.height,
          imageWidth: image.width,
          captureDate: new Date(),
          compression: "JPEGB",
          pose: "F",
          type: "probe",
          ofiqResults,
        });
      }
    } catch (e) {
      console.error("Slapshot - captureBiometricsAsync error: " + e);
      viewModel.failCaptureBiometrics();
    } finally {
      setSpinnerText(undefined);
      viewModel.completeExportIdentity();
    }
  };

  const uploadReference = async () => {
    const handlePress = async (
      fn: (options: ImagePickerOptions) => Promise<ImagePickerResult>,
    ) => {
      const result = await fn({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        const image = result.assets[0];
        setReference({
          referenceId: `reference-${Date.now()}`,
          image: image.base64 || "",
          imageHeight: image.height,
          imageWidth: image.width,
          captureDate: new Date(),
          compression: "JPEGB",
          type: "reference",
          pose: "R",
        });
      }
    };
    Alert.alert(tHelper("uploadReference"), tHelper("uploadReferenceDesc"), [
      {
        text: "Camera",
        onPress: handlePress.bind(null, launchCameraAsync),
      },
      {
        text: "Photos",
        onPress: handlePress.bind(null, launchImageLibraryAsync),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handlePressProbe = () => {
    if (!probe) {
      captureFace();
    } else {
      Alert.alert(
        tHelper("replaceExistingFaceImage"),
        tHelper("replaceExistingFaceImageDesc"),
        [
          { text: tHelper("cancel"), style: "cancel" },
          { text: tHelper("replace"), onPress: captureFace },
        ],
      );
    }
  };

  const handleSubmit = async () => {
    if (!probe || !reference) {
      Alert.alert(
        tHelper("error"),
        tHelper("pleaseCaptureFaceAndUploadReference"),
      );
      return;
    }

    try {
      setSpinnerText(tHelper("submittingFaceCompare"));
      const submissionSettings = getValue("submissionSettings");
      if (!submissionSettings) throw new Error("Submission settings not set");
      const tcn = createTCN();

      const faceCompareDTO: Transaction = {
        ...submissionSettings,
        tot: "Compare",
        transactionDate: new Date(),
        geoLocation: "",
        tcn,
        applicationName: "",
        applicationVersion: "",
        biographicData: {
          firstName: "",
          lastName: "",
          dob: "",
          sex: "",
          race: "",
          citizenship: "",
          birthCountry: "",
          eyeColor: "",
          collectionReason: "",
          hairColor: "",
          documents: [],
        },
        faces: [probe, reference],
        fingers: [],
        irises: [],
      };
      await addSubmission(faceCompareDTO);
      router.push("/faceCompare");
    } catch (error) {
      console.error("Error submitting face compare:", error);
      Alert.alert(tHelper("error"), tHelper("failedToSubmitFaceCompare"));
    } finally {
      setSpinnerText(undefined);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {spinnerText && <Spinner message={spinnerText} />}
      <View style={styles.buttonContainer}>
        <AddImageButton
          text={tHelper("captureFace1")}
          icon="user-circle-o"
          onPress={handlePressProbe}
          height={
            probe
              ? scaleRelative(probe.imageHeight, probe.imageWidth, 200)
              : undefined
          }
          width={200}
          image={probe?.image}
          ofiqResults={probe?.ofiqResults}
        />
        {!probe?.ofiqResults && <View style={styles.placeholder} />}
        <AddImageButton
          text={tHelper("uploadReference")}
          icon="file-image-o"
          onPress={uploadReference}
          height={
            reference
              ? scaleRelative(reference.imageHeight, reference.imageWidth, 200)
              : undefined
          }
          width={200}
          image={reference?.image}
        />
      </View>
      <FormButtons
        onSubmit={handleSubmit}
        onCancel={router.push.bind(null, "/faceCompare")}
        submitDisabled={!probe || !reference}
        submitText={tHelper("submit")}
      />
      <View style={{ display: "none" }}>
        <SlapshotCaptureView readyCallback={viewModel.onViewReady} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  buttonContainer: {
    flex: 1,
    margin: 10,
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  backButtonContainer: {
    flexDirection: "row",
    gap: 20,
    paddingHorizontal: 20,
    width: "100%",
  },
  placeholder: { height: 35 },
});
