import { Image, StyleSheet } from "react-native";
import { SubmissionItem } from "../types";
import { extractSubmissionErrorReason } from "../submissionResponse";
import { getBase64Image } from "@/util/fs";
import { scaleRelative } from "@/util/scaleRelative";
import { FontAwesome } from "@expo/vector-icons";
import { useState, useEffect, useMemo } from "react";
import { Text, useThemeColor, View } from "@/components/themed";

export const CompareSubmissionData = (props: SubmissionItem) => {
  const { remark, thumbnail, thumbnailReference, pending, elapsedTime, tcn } =
    props;
  const [thumbnailBase64, setThumbnailBase64] = useState("");
  const [thumbnailReferenceBase64, setThumbnailReferenceBase64] = useState("");

  const errorReason = useMemo(() => {
    return props.responseErrorReason ?? extractSubmissionErrorReason(remark);
  }, [props.responseErrorReason, remark]);

  const isMatch = useMemo(() => {
    if (!remark || pending || errorReason) return null;
    return !remark.toLowerCase().includes("no match");
  }, [errorReason, remark, pending]);

  const score = useMemo(() => {
    if (!remark || pending || errorReason) return null;
    const match = remark.match(/score:\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }, [errorReason, remark, pending]);

  useEffect(() => {
    thumbnail?.image &&
      getBase64Image(thumbnail.image).then((v) => v && setThumbnailBase64(v));
  }, [thumbnail]);

  useEffect(() => {
    thumbnailReference?.image &&
      getBase64Image(thumbnailReference.image).then(
        (v) => v && setThumbnailReferenceBase64(v),
      );
  }, [thumbnailReference]);

  const primaryColor = useThemeColor({}, "primary");
  const successColor = useThemeColor({}, "success");
  const dangerColor = useThemeColor({}, "danger");

  return (
    <View style={styles.container}>
      <Text style={styles.tcn}>{tcn}</Text>
      <View style={styles.images}>
        {thumbnail && thumbnailBase64 ? (
          <Image
            height={scaleRelative(
              thumbnail.imageHeight,
              thumbnail.imageWidth,
              100,
            )}
            style={styles.image}
            width={100}
            source={{ uri: `data:image/png;base64,${thumbnailBase64}` }}
          />
        ) : (
          <View style={styles.userIcon}>
            <FontAwesome name="user" color={primaryColor} size={100} />
          </View>
        )}
        {thumbnailReference && thumbnailReferenceBase64 ? (
          <Image
            height={scaleRelative(
              thumbnailReference.imageHeight,
              thumbnailReference.imageWidth,
              100,
            )}
            style={styles.image}
            width={100}
            source={{
              uri: `data:image/png;base64,${thumbnailReferenceBase64}`,
            }}
          />
        ) : (
          <View style={styles.userIcon}>
            <FontAwesome name="user" color={primaryColor} size={100} />
          </View>
        )}
        {pending ? (
          <Text>Pending: {elapsedTime ?? "00:00:00"}</Text>
        ) : (
          <>
            <View style={styles.result}>
              <View>
                <Text style={styles.resultItem}>
                  Result:{" "}
                  <Text
                    style={[
                      styles.resultItem,
                      {
                        color: errorReason
                          ? dangerColor
                          : isMatch
                            ? successColor
                            : dangerColor,
                      },
                    ]}
                  >
                    {errorReason ? "Error" : isMatch ? "Match" : "No Match"}
                  </Text>
                </Text>
              </View>
              {errorReason ? (
                <View>
                  <Text style={styles.resultItem}>
                    Reason:{" "}
                    <Text style={{ color: dangerColor }}>{errorReason}</Text>
                  </Text>
                </View>
              ) : null}
              {score !== null && (
                <View>
                  <Text style={styles.resultItem}>
                    Score:{" "}
                    <Text
                      style={{ color: isMatch ? successColor : dangerColor }}
                    >
                      {score}
                    </Text>
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    gap: 10,
    elevation: 1,
  },

  images: {
    justifyContent: "space-evenly",
    flexDirection: "row",
    gap: 10,
    flexGrow: 3,
  },
  result: {
    flexDirection: "column",
    flex: 1,
    flexShrink: 1,
    justifyContent: "space-evenly",
  },
  image: {
    borderRadius: 8,
  },
  userIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 100,
  },
  tcn: {
    fontWeight: 500,
  },
  resultItem: {
    fontWeight: 500,
    flexWrap: "wrap",
  },
});
