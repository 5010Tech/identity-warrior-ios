import { useThemeColor } from "@/components/themed";
import { StyleSheet, View, ViewProps } from "react-native";

/**
 * A content card: surface background, 1pt outline, 16pt corners
 * (Android: MaterialCardView with iw_surface / iw_stroke).
 */
export function Card({ style, ...rest }: ViewProps) {
  const surface = useThemeColor({}, "surface");
  const stroke = useThemeColor({}, "stroke");
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: surface, borderColor: stroke },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 16,
  },
});
