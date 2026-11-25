import { H2, Text, useThemeColor, View } from "@/components/themed";
import { FacePoseIcon } from "@/components/FacePoseIcon";
import { tHelper, translationKey } from "@/translations/translationHelper";
import { FaceDTO, Pose } from "@/types";
import { scaleRelative } from "@/util/scaleRelative";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useCaptureValue } from "./context/hooks";

interface FaceCaptureIconProps {
  pose: Pose;
  /**
   * Required poses always show a status mark (alert until captured). Optional
   * ones are labelled "(Optional)" and only get a mark once captured.
   */
  required?: boolean;
}

/** Card labels, as in the Android app's face_prompt.xml. */
const POSE_LABELS: Record<Pose, translationKey> = {
  F: "captureFrontalFace",
  L: "captureLeftProfile",
  R: "captureRightProfile",
  LA: "captureAngledFace",
  RA: "captureAngledFace",
};

export const FaceCaptureIcon = ({
  pose,
  required = pose === "F",
}: FaceCaptureIconProps) => {
  const faces = useCaptureValue<FaceDTO[]>("transaction.faces");

  const index = (faces || []).findIndex((f) => f.pose === pose);

  const { image, compression } = faces?.[index] || {};
  const color = useThemeColor({}, "primary");
  const stroke = useThemeColor({}, "textStrong");
  const success = useThemeColor({}, "success");
  const danger = useThemeColor({}, "danger");
  const router = useRouter();
  // The cards share the screen height; the icon and label grow with the card.
  const [cardHeight, setCardHeight] = useState(0);
  const iconSize = Math.max(72, Math.min(100, Math.round(cardHeight - 30)));
  const labelSize = iconSize >= 92 ? 22 : 20;

  const { transactionType } = useGlobalSearchParams<{
    transactionType: string;
  }>();

  // Opens the in-app face camera (no Slapshot) for this pose.
  const captureFace = () =>
    router.push({
      pathname: "/capture/[transactionType]/faceCamera",
      params: { transactionType, pose },
    });

  const iconStyle = ["L", "LA"].includes(pose)
    ? { transform: [{ scaleX: -1 }] }
    : {};

  return (
    <View style={styles.wrapper}>
      {/* Android face_prompt.xml card: 2pt outline, pose icon (or the photo once
          captured), label, status mark. */}
      <TouchableOpacity
        style={[styles.card, { borderColor: stroke }]}
        onPress={captureFace}
        onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
      >
        <View style={[styles.thumb, { width: iconSize, height: iconSize }]}>
          {image ? (
            <Image
              style={[styles.photo, { width: iconSize, height: iconSize }]}
              resizeMode="contain"
              source={{
                uri: `data:image/${
                  compression?.toLowerCase() || "png"
                };base64,${image}`,
              }}
            />
          ) : (
            <FacePoseIcon pose={pose} size={iconSize} color={stroke} />
          )}
        </View>
        <Text style={[styles.label, { color: stroke, fontSize: labelSize }]}>
          {tHelper(POSE_LABELS[pose])}
          {required ? "" : tHelper("optionalSuffix")}
        </Text>
        {image ? (
          <MaterialCommunityIcons name="check-all" size={32} color={success} />
        ) : required ? (
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={32}
            color={danger}
          />
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, minHeight: 96, maxHeight: 132 },
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  thumb: {
    alignItems: "center",
    justifyContent: "center",
  },
  photo: { borderRadius: 8 },
  label: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
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
    marginTop: 6,
    borderRadius: 10,
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
