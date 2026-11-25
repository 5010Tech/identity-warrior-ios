import { useThemeColor } from "@/components/themed";
import { StyleSheet } from "react-native";

/** Outlined, rounded field like the Android app's inputs and dropdowns. */
export const inputStyles = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
  },
});

/** Theme colors for a field: outline, fill and text. */
export const useInputColors = () => {
  const borderColor = useThemeColor({}, "strokeStrong");
  const backgroundColor = useThemeColor({}, "surface");
  const color = useThemeColor({}, "text");
  const placeholder = useThemeColor({}, "textSecondary");
  return { borderColor, backgroundColor, color, placeholder };
};
