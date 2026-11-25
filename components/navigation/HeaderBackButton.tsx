import { tHelper } from "@/translations/translationHelper";
import { FontAwesome } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";
import { Text, useThemeColor } from "../themed";
import { useGoBackOnce } from "./useGoBackOnce";

export default function HeaderBackButton() {
  const goBack = useGoBackOnce();
  const primaryColor = useThemeColor({}, "primary");
  return (
    <Pressable
      onPress={goBack}
      style={styles.button}
      hitSlop={12}
      accessibilityRole="button"
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
