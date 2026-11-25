import { tHelper } from "@/translations/translationHelper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { useThemeColor } from "../themed";

/** The header's menu button for a screen with a slide-out menu. */
export default function DrawerMenuButton() {
  const navigation = useNavigation();
  const color = useThemeColor({}, "primary");
  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      style={styles.button}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={tHelper("menu")}
    >
      <MaterialCommunityIcons name="menu" size={28} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: 14, paddingVertical: 6 },
});
