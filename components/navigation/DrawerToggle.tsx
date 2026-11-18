import { FontAwesome } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { Pressable } from "react-native";
import { ThemeColorName, useThemeColor } from "../themed";

interface DrawerToggleProps {
  color?: ThemeColorName;
}

export default function DrawerToggle({ color = "primary" }: DrawerToggleProps) {
  const navigation = useNavigation();
  const themeColor = useThemeColor({}, color);

  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
    >
      <FontAwesome name="bars" size={24} color={themeColor} />
    </Pressable>
  );
}
