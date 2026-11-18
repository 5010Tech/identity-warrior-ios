import { tHelper } from "@/translations/translationHelper";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { Text, useThemeColor } from "../themed";

export default function HeaderBackButton() {
  const navigation = useNavigation();
  const primaryColor = useThemeColor({}, "primary");
  return (
    <Pressable
      onPress={() => navigation.goBack()}
      style={styles.button}
      hitSlop={8}
    >
      <Text style={{ color: primaryColor }}>
        <FontAwesome name="chevron-left" size={16} color={primaryColor} />{" "}
        {tHelper("back")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
});
