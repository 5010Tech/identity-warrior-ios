import { Text, useThemeColor, View } from "@/components/themed";
import { tHelper } from "@/translations/translationHelper";
import { saveBase64Image } from "@/util/fs";
import { FontAwesome } from "@expo/vector-icons";
import { EncodingType } from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { Image, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { OFIQResults } from "../ofiq/OFIQCalculator";

interface AddImageButtonProps {
  onPress: () => void | Promise<void>;
  image?: Base64URLString;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  text: string;
  height?: number;
  width?: number;
  ofiqResults?: OFIQResults;
}

export const AddImageButton = ({
  onPress,
  image,
  icon,
  text,
  height = 200,
  width = 200,
  ofiqResults,
}: AddImageButtonProps) => {
  const primaryColor = useThemeColor({}, "primary");
  const textInverseColor = useThemeColor({}, "textInverse");
  const handlePress = () => {
    onPress();
  };
  const router = useRouter();

  const handleOfiqPress = async () => {
    if (!image) {
      return;
    }
    await saveBase64Image(image, `ofiq.jpg`, EncodingType.Base64);
    router.push("/ofiq");
  };
  return (
    <View>
      <TouchableOpacity onPress={handlePress}>
        <View
          style={[
            styles.button,
            {
              borderColor: primaryColor,
              borderBottomRightRadius: !!ofiqResults ? 0 : 10,
              borderBottomLeftRadius: !!ofiqResults ? 0 : 10,
              borderBottomWidth: !!ofiqResults ? 0 : 5,
            },
          ]}
        >
          {image ? (
            <Image
              style={styles.image}
              height={height}
              width={width}
              source={{
                uri: image ? `data:image/png;base64,${image}` : "",
              }}
            />
          ) : (
            <FontAwesome name={icon} size={100} color={primaryColor} />
          )}
          <Text style={[styles.text, { color: primaryColor }]}>{text}</Text>
        </View>
      </TouchableOpacity>
      {!!ofiqResults && (
        <TouchableOpacity onPress={handleOfiqPress}>
          <View style={[styles.ofiqView, { backgroundColor: primaryColor }]}>
            <Text
              style={{
                color: textInverseColor,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {tHelper("qualityScore")}
              {ofiqResults.score.toFixed(0)}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 5,
    borderRadius: 10,
    width: 300,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  text: {
    textAlign: "center",
    fontSize: 32,
    fontWeight: 600,
  },
  image: {
    borderRadius: 10,
  },
  ofiqView: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    padding: 10,
    textAlign: "center",
    alignItems: "center",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
});
