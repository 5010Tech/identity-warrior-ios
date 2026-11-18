import { useSlapshotContext } from "@/components/Slapshot/SlapshotContext";
import { H2, Text, useThemeColor, View } from "@/components/themed";
import {
  CaptureError,
  SlapshotCaptureError,
} from "@/modules/slapshot-capture-library/src";
import { tHelper } from "@/translations/translationHelper";
import { FaceDTO, Pose } from "@/types";
import { deleteFileOrDirectory, saveBase64Image } from "@/util/fs";
import { scaleRelative } from "@/util/scaleRelative";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { Alert, Image, StyleSheet, TouchableOpacity } from "react-native";
import { logger } from "react-native-logs";
import { EncodingType } from "expo-file-system/legacy";
import { useCaptureActions, useCaptureValue } from "./context/hooks";
import {
  OFIQResults,
  ImageDetails,
  processImage,
} from "../ofiq/OFIQCalculator";

interface FaceCaptureIconProps {
  pose: Pose;
}

export const FaceCaptureIcon = ({ pose }: FaceCaptureIconProps) => {
  const log = logger.createLogger();
  const faces = useCaptureValue<FaceDTO[]>("transaction.faces");
  const { setValue } = useCaptureActions();

  const textInverseColor = useThemeColor({}, "textInverse");
  const index = (faces || []).findIndex((f) => f.pose === pose);

  const { image, compression, imageHeight, imageWidth, ofiqResults } =
    faces?.[index] || {};
  const color = useThemeColor({}, "primary");
  const router = useRouter();

  const viewModel = useSlapshotContext();
  if (!viewModel) return null;

  const ofiqClick = (imgBase64: string) => async () => {
    await saveBase64Image(imgBase64, `ofiq.jpg`, EncodingType.Base64);
    router.navigate({ pathname: "/ofiq" });
  };

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
        console.error("Slapshot capture error: " + capturedResult);
        viewModel.failCaptureBiometrics();

        return;
      }
      const imageData = await viewModel.exportIdentity(capturedResult);
      if (SlapshotCaptureError.isError(imageData)) {
        throw new Error(`Failed to export biometric data: ${imageData.error}`);
      }

      const image = imageData?.faces?.[0]?.image;
      if (image) {
        let ofiqResults: OFIQResults | undefined;
        if (pose === "F") {
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

          if (filePath) {
            const currentImage: ImageDetails = {
              path: filePath,
              width: 1000,
              height: 1000,
            };
            ofiqResults = await processImage(currentImage);
            await deleteFileOrDirectory("ofiq.jpg");
          }
        }

        const faceDTO: FaceDTO = {
          referenceId: `F-${pose}-${index}`,
          imageHeight: image.height,
          imageWidth: image.width,
          image: image.imageBytesBase64,
          captureDate: new Date(),
          compression: "JPEGB",
          pose,
          ofiqResults,
        };
        setValue<FaceDTO>(
          `transaction.faces[${index === -1 ? faces.length : index}]`,
          faceDTO,
        );
      }
    } catch (e) {
      log.error("Slapshot - captureBiometricsAsync error: " + e);
      viewModel.failCaptureBiometrics();
    } finally {
      viewModel.completeExportIdentity();
    }
  };

  const iconStyle = ["L", "LA"].includes(pose)
    ? { transform: [{ scaleX: -1 }] }
    : {};

  return (
    <View>
      <TouchableOpacity
        style={styles.container}
        onPress={!image ? captureFace : captureFace}
      >
        {image ? (
          <Image
            height={scaleRelative(imageHeight, imageWidth, 100)}
            width={100}
            source={{
              uri: `data:image/${
                compression?.toLowerCase() || "png"
              };base64,${image}`,
            }}
          />
        ) : (
          <MaterialCommunityIcons
            name={pose === "F" ? "face-man" : "face-man-profile"}
            size={100}
            color={color}
            style={[styles.info]}
          />
        )}
        <H2 style={styles.text}>
          {tHelper("capture")} {tHelper(pose)}
        </H2>
      </TouchableOpacity>
      {ofiqResults ? (
        <TouchableOpacity
          style={styles.container}
          onPress={ofiqClick(image ?? "")}
        >
          <View style={[styles.ofiqView, { backgroundColor: color }]}>
            <Text style={{ fontSize: 20, color: textInverseColor }}>
              {tHelper("qualityScore")}
              {ofiqResults.score.toFixed(0)}
            </Text>
            <MaterialCommunityIcons
              name={"information-outline"}
              size={25}
              color={textInverseColor}
              style={[styles.info, iconStyle]}
            />
          </View>
        </TouchableOpacity>
      ) : pose === "F" ? (
        <View style={styles.ofiqPlaceholder} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {},
  text: {
    flexShrink: 1,
  },
  ofiqView: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    padding: 5,
    textAlign: "center",
    alignItems: "center",
  },
  ofiqPlaceholder: {
    height: 35,
  },
  ofiq: {
    height: "100%",
    verticalAlign: "middle",
  },
  info: {
    height: "100%",
    verticalAlign: "bottom",
  },
});
