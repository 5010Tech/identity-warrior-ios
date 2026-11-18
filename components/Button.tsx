import { themeColors } from "@/constants/style/Colors";
import { forwardRef } from "react";
import {
  Pressable as DefaultPressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from "react-native";

interface ButtonProps extends PressableProps {
  text: string;
  textStyle?: StyleProp<TextStyle>;
}
export const Button = forwardRef<View, ButtonProps>(
  ({ children, style, text, textStyle, disabled, ...rest }, ref) => {
    return (
      <DefaultPressable
        style={({ pressed }) => [
          styles.button,
          style || styles.none,
          disabled ? styles.disabled : styles.none,
          { opacity: pressed ? 0.8 : 1 },
        ]}
        ref={ref}
        disabled={disabled}
        {...rest}
      >
        <Text style={[styles.text, textStyle || styles.none]}>{text}</Text>
      </DefaultPressable>
    );
  },
);

Button.displayName = "Button";

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    elevation: 3,
    shadowColor: "#333",
    shadowOpacity: 0.15,
    backgroundColor: themeColors.blue,
    width: "100%",
  },
  disabled: {
    backgroundColor: "#c9c9c9",
  },
  text: {
    color: "#fff",
    fontWeight: 600,
    fontSize: 16,
  },
  none: {},
});
