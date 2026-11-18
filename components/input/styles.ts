import { themeColors } from "@/constants/style/Colors";
import { StyleSheet } from "react-native";

export const inputStyles = StyleSheet.create({
  input: {
    borderColor: themeColors.darkGray,
    borderBottomWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 15,
    paddingVertical: 5,
    fontSize: 16,
  },
});
