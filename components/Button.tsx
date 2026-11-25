import { useThemeColor } from "@/components/themed";
import { themeColors } from "@/constants/style/Colors";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { forwardRef } from "react";
import {
  Pressable as DefaultPressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

/**
 * Button styles ported from the Android app (styles.xml / capture_main.xml):
 * - primary:     Widget.IWA.Button.Primary   – filled, 56pt min height, 12pt corners
 * - secondary:   Widget.IWA.Button.Secondary – outlined (2pt), surface background
 * - destructive: iwa_button_destructive_bg   – filled 5010 red
 * - capture:     the large outlined transaction buttons on the Capture screen
 *                (50pt outline, bold caps, icon on the left)
 * Sizes are large on purpose: Identity Warrior is used with gloves in the field.
 */
export type ButtonVariant = "primary" | "secondary" | "destructive" | "capture";

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface ButtonProps extends PressableProps {
  text: string;
  textStyle?: StyleProp<TextStyle>;
  variant?: ButtonVariant;
  icon?: IconName;
  /** Icon size override (the capture buttons grow with the screen). */
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

export const Button = forwardRef<View, ButtonProps>(
  (
    { style, text, textStyle, disabled, variant = "primary", icon, iconSize, ...rest },
    ref,
  ) => {
    const button = useThemeColor({}, "button");
    const buttonDisabled = useThemeColor({}, "buttonDisabled");
    const buttonText = useThemeColor({}, "buttonText");
    const surface = useThemeColor({}, "surface");
    const strokeStrong = useThemeColor({}, "strokeStrong");
    const divider = useThemeColor({}, "divider");
    const textColor = useThemeColor({}, "text");
    const textStrong = useThemeColor({}, "textStrong");
    const textSecondary = useThemeColor({}, "textSecondary");

    let containerColors: ViewStyle;
    let labelColor: string;
    switch (variant) {
      case "secondary":
        containerColors = {
          backgroundColor: surface,
          borderColor: disabled ? divider : strokeStrong,
          borderWidth: 2,
        };
        labelColor = disabled ? strokeStrong : textColor;
        break;
      case "capture":
        containerColors = {
          backgroundColor: surface,
          borderColor: disabled ? strokeStrong : textStrong,
          borderWidth: 2,
        };
        labelColor = disabled ? textSecondary : textStrong;
        break;
      case "destructive":
        containerColors = {
          backgroundColor: disabled ? buttonDisabled : themeColors.red,
        };
        labelColor = disabled ? textSecondary : buttonText;
        break;
      default:
        containerColors = {
          backgroundColor: disabled ? buttonDisabled : button,
        };
        // Greyed label as well as background: in dark mode the two filled
        // backgrounds are close, so the label has to show it too.
        labelColor = disabled ? textSecondary : buttonText;
    }

    const isCapture = variant === "capture";

    return (
      <DefaultPressable
        style={({ pressed }) => [
          styles.button,
          isCapture ? styles.capture : styles.standard,
          isCapture && styles.captureShape,
          containerColors,
          { opacity: pressed ? 0.75 : disabled && !isCapture ? 0.6 : 1 },
          style,
        ]}
        ref={ref}
        disabled={disabled}
        accessibilityRole="button"
        {...rest}
      >
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={iconSize ?? (isCapture ? 24 : 22)}
            color={labelColor}
            style={isCapture ? styles.captureIcon : styles.icon}
          />
        ) : null}
        <Text
          style={[
            styles.text,
            isCapture ? styles.captureText : null,
            { color: labelColor },
            textStyle,
          ]}
          numberOfLines={isCapture ? 1 : 2}
          adjustsFontSizeToFit={isCapture}
          minimumFontScale={isCapture ? 12 / 18 : 0.7}
        >
          {text}
        </Text>
      </DefaultPressable>
    );
  },
);

Button.displayName = "Button";

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    width: "100%",
  },
  standard: {
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  capture: {
    justifyContent: "flex-start",
    // Android's 62dp MaterialButton draws a 50dp outline (6dp inset top and bottom).
    height: 50,
    paddingStart: 18,
    paddingEnd: 12,
  },
  captureShape: {
    borderRadius: 12,
  },
  icon: {
    marginEnd: 10,
  },
  captureIcon: {
    marginEnd: 14,
  },
  text: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  captureText: {
    flexShrink: 1,
    flexGrow: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: 1.6,
  },
});
