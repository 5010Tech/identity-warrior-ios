import { IconName } from "@/components/Button";
import { themeColors } from "@/constants/style/Colors";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { forwardRef } from "react";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
} from "react-native";

/** Gunmetal plate: fades from PLATE_TOP down to PLATE_BOTTOM, with a steel outline. */
const PLATE_TOP = "#3D444D";
const PLATE_BOTTOM = "#1B1F24";
const PLATE_EDGE = "#6B7580";
/** 5010 red, for the icon badge, chevron, bottom bar and glow. */
const ACCENT = themeColors.red;

interface CaptureTileProps extends PressableProps {
  title: string;
  icon: IconName;
  /** Per-transaction accent. Not drawn while every tile uses the brand red. */
  color?: string;
}

/**
 * A Capture-screen tile: a gunmetal plate that fades from lighter at the top
 * to darker at the bottom (the same in light and dark mode)
 * with a red icon badge, the transaction name in white bold caps, a red
 * chevron and bottom bar, and a soft red glow underneath.
 */
export const CaptureTile = forwardRef<View, CaptureTileProps>(
  // `style` is dropped on purpose: <Link asChild> passes its own style down,
  // which would otherwise replace the tile's layout.
  ({ title, icon, color: _color, style: _linkStyle, ...rest }, ref) => (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      {...rest}
      style={({ pressed }) => [styles.glow, pressed && styles.pressed]}
    >
      <View style={styles.plate}>
        <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="plate" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={PLATE_TOP} />
              <Stop offset="1" stopColor={PLATE_BOTTOM} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#plate)" />
        </Svg>
        <View style={styles.content}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name={icon} size={32} color="#FFFFFF" />
          </View>
          <Text
            style={styles.title}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {title}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={34} color={ACCENT} />
        </View>
        <View style={styles.bar} />
      </View>
    </Pressable>
  ),
);
CaptureTile.displayName = "CaptureTile";

const styles = StyleSheet.create({
  // The shadow lives on the outer view; the plate inside clips its corners.
  glow: {
    flex: 1,
    borderRadius: 22,
    shadowColor: ACCENT,
    shadowOpacity: 0.45,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  plate: {
    flex: 1,
    backgroundColor: PLATE_BOTTOM,
    borderColor: PLATE_EDGE,
    borderWidth: 2,
    borderRadius: 22,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 8,
  },
  badge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  title: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  bar: { height: 6, backgroundColor: ACCENT },
});
