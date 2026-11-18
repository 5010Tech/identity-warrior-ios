import { H2, Text, useThemeColor, View } from "@/components/themed";
import Colors from "@/constants/style/Colors";
import { useCaptureValue } from "@/features/capture/context/hooks";
import { tHelper } from "@/translations/translationHelper";
import { Iris, IrisEyePosition } from "@/types";
import { hasMissingIrisReason } from "@/types/util";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Image, StyleSheet } from "react-native";

interface IrisCaptureIconProps {
  eyePosition: IrisEyePosition;
}

export const IrisCaptureIcon = ({ eyePosition }: IrisCaptureIconProps) => {
  const irises = useCaptureValue<Iris[]>("transaction.irises");
  const iris = irises.find((item) => item.eyePosition === eyePosition);
  const imageUri = iris?.image
    ? `data:image/png;base64,${iris.image}`
    : undefined;
  const missing = hasMissingIrisReason(iris);

  const [statusText, statusColorName]: [
    text: string,
    keyof typeof Colors.dark & keyof typeof Colors.dark,
  ] = useMemo(() => {
    if (missing) {
      return [tHelper("missing"), "text"];
    }
    if (iris?.image) {
      return [tHelper("captured"), "primary"];
    }
    return [tHelper("capturePending"), "warning"];
  }, [iris?.image, missing]);

  const statusColor = useThemeColor({}, statusColorName);
  const textInverse = useThemeColor({}, "textInverse");
  const successColor = useThemeColor({}, "success");

  return (
    <>
      {imageUri && !missing ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} />
        </View>
      ) : (
        <MaterialCommunityIcons
          name={missing ? "eye-off-outline" : "eye-outline"}
          size={75}
          color={iris?.image ? successColor : undefined}
        />
      )}
      <View style={styles.textContainer}>
        <H2 style={styles.text}>
          {eyePosition === "left" ? tHelper("leftEye") : tHelper("rightEye")}
        </H2>
        <Text
          style={[
            styles.status,
            { color: textInverse, backgroundColor: statusColor },
          ]}
        >
          {statusText}
        </Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 10,
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 100,
    width: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  textContainer: {
    gap: 5,
    alignItems: "center",
  },
  text: {
    textAlign: "center",
  },
  status: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    overflow: "hidden",
    textAlign: "center",
  },
});
