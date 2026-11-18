import { StyleSheet, Image } from "react-native";
import { SubmissionItem } from "../types";
import { scaleRelative } from "@/util/scaleRelative";
import { FontAwesome } from "@expo/vector-icons";
import { getBase64Image } from "@/util/fs";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { Text, useThemeColor, View } from "@/components/themed";
import { TouchableOpacity } from "react-native-gesture-handler";

export const CaptureSubmissionData = ({
  thumbnail,
  tcn,
  sensors,
  tot,
  biographicData: { firstName, lastName },
  failed,
  pending,
  isSwiping,
  elapsedTime,
}: SubmissionItem & { isSwiping: boolean }) => {
  const [thumbnailBase64, setThumbnailBase64] = useState("");
  useEffect(() => {
    thumbnail?.image &&
      getBase64Image(thumbnail.image).then((v) => v && setThumbnailBase64(v));
  }, [thumbnail]);

  const handlePressRow = () => {
    if (!isSwiping) {
      router.push({
        pathname: "/submissions/[tcn]",
        params: { tcn },
      });
    }
  };

  const primaryColor = useThemeColor({}, "primary");
  const dangerColor = useThemeColor({}, "danger");
  const secondaryColor = useThemeColor({}, "secondary");
  const successColor = useThemeColor({}, "success");

  return (
    <TouchableOpacity onPress={handlePressRow}>
      <View style={[styles.container, { borderColor: primaryColor }]}>
        {thumbnail && thumbnailBase64 ? (
          <Image
            height={scaleRelative(
              thumbnail.imageHeight,
              thumbnail.imageWidth,
              100,
            )}
            width={100}
            source={{ uri: `data:image/png;base64,${thumbnailBase64}` }}
          />
        ) : (
          <View style={styles.userIcon}>
            <FontAwesome name="user" color={primaryColor} size={100} />
          </View>
        )}
        <View style={styles.data}>
          <Text style={styles.name}>
            {lastName}
            {lastName && firstName ? ", " : ""}
            {firstName}
          </Text>
          <Text>{tcn}</Text>
          <Text style={styles.result}>
            {tot}:{" "}
            <Text
              style={{
                color: sensors?.length
                  ? successColor
                  : pending
                    ? secondaryColor
                    : dangerColor,
              }}
            >
              {sensors?.length
                ? "Match"
                : pending
                  ? `Pending (${elapsedTime})`
                  : failed
                    ? "Not Submitted"
                    : "No Match"}
            </Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    flexDirection: "row",
    gap: 10,
    elevation: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 500,
  },
  data: {
    justifyContent: "space-evenly",
    flexShrink: 1,
    gap: 5,
  },
  result: {
    fontWeight: 500,
    fontSize: 16,
  },
  userIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 100,
  },
});
