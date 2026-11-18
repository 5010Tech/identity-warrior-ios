import { H2, Text, useThemeColor, View } from "@/components/themed";
import Colors from "@/constants/style/Colors";
import { tHelper, translationKey } from "@/translations/translationHelper";
import { FGP, Finger } from "@/types";
import { Base64Image, NFIQScore } from "@/types/BiometricData";
import { mapToFingerType } from "@/types/util";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Image, StyleSheet, TouchableOpacity } from "react-native";
import { useCaptureValue } from "./context/hooks";

interface FingerCaptureIconProps {
  fingerPosition: FGP;
  onPress: (fingerPosition: FGP, fingerIndex: number) => void;
}

export const FingerCaptureIcon = ({
  fingerPosition,
  onPress,
}: FingerCaptureIconProps) => {
  const fingers = useCaptureValue<Finger[]>("transaction.fingers");

  const fingerIndex = fingers.findIndex(
    (image) => fingerPosition === Number(image.fingerPosition),
  );

  const imageData = fingers[fingerIndex];

  const pngImage = useCaptureValue<Base64Image>(
    `pngFingers.${mapToFingerType(fingerPosition)}`,
  );

  const handlePress = () => {
    onPress(fingerPosition, fingerIndex);
  };

  const missing = useMemo(
    () => imageData?.missingFingerprints?.length,
    [imageData?.missingFingerprints?.length],
  );

  const [scoreText, scoreColorName]: [
    text: string,
    keyof typeof Colors.dark & keyof typeof Colors.dark,
  ] = useMemo(() => {
    if (missing) {
      return [tHelper("missing"), "text"];
    }
    const score = imageData?.nfiqs?.[0]?.nfiq as NFIQScore;
    switch (score) {
      case NFIQScore.EXCELLENT:
        return [tHelper("excellent"), "success"];
      case NFIQScore.VERY_GOOD:
        return [tHelper("veryGood"), "success"];
      case NFIQScore.GOOD:
        return [tHelper("good"), "warning"];
      case NFIQScore.FAIR:
        return [tHelper("fair"), "warning"];
      case NFIQScore.POOR:
        return [tHelper("poor"), "danger"];
      default:
        return [tHelper("captured"), "primary"];
    }
  }, [imageData?.nfiqs, missing]);

  const scoreColor = useThemeColor({}, scoreColorName);
  const textInverse = useThemeColor({}, "textInverse");
  const successColor = useThemeColor({}, "success");

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      {imageData?.image && pngImage !== "captured" ? (
        <View style={styles.imageContainer}>
          <Image
            height={75}
            width={
              (imageData.imageWidth ?? 0) * (75 / (imageData.imageHeight ?? 1))
            }
            source={{ uri: `data:image/png;base64,${pngImage}` }}
          />
        </View>
      ) : (
        <MaterialCommunityIcons
          name={missing ? "close" : "fingerprint"}
          size={75}
          color={pngImage === "captured" ? successColor : undefined}
        />
      )}
      <View style={{ flexShrink: 1, gap: 5 }}>
        <H2 style={styles.text}>
          {tHelper("capture")}{" "}
          {tHelper(fingerPosition.toString() as translationKey)}
        </H2>
        {imageData && (
          <Text
            style={[
              styles.score,
              { color: textInverse, backgroundColor: scoreColor },
            ]}
          >
            {scoreText}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  text: {
    flexShrink: 1,
  },
  imageContainer: {
    gap: 5,
    alignItems: "center",
  },
  score: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    overflow: "hidden",
    textAlign: "center",
  },
});
