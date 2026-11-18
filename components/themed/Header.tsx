import { forwardRef } from "react";
import { StyleSheet, Text } from "react-native";
import { TextProps, useThemeColor } from "./Themed";
import Colors from "@/constants/style/Colors";

type HeaderProps = TextProps & {
  colorName?: keyof typeof Colors.light & keyof typeof Colors.dark;
};
const Header = forwardRef<Text, HeaderProps>(
  ({ style, colorName = "primary", ...rest }, ref) => {
    const color = useThemeColor({}, colorName);
    return <Text style={[{ color }, style]} ref={ref} {...rest} />;
  },
);

export const H1 = forwardRef<Text, TextProps>(({ style, ...rest }, ref) => {
  return <Header style={[styles.h1, style]} ref={ref} {...rest} />;
});

export const H2 = forwardRef<Text, TextProps>(({ style, ...rest }, ref) => {
  return <Header style={[styles.h2, style]} ref={ref} {...rest} />;
});
export const H3 = forwardRef<Text, TextProps>(({ style, ...rest }, ref) => {
  return (
    <Header
      style={[styles.h3, style]}
      ref={ref}
      colorName="secondary"
      {...rest}
    />
  );
});

Header.displayName = "Header";
H1.displayName = "H1";
H2.displayName = "H2";
H3.displayName = "H3";

const styles = StyleSheet.create({
  h1: {
    fontSize: 40,
    fontWeight: 800,
  },
  h2: {
    fontSize: 20,
    fontWeight: 700,
  },
  h3: {
    fontSize: 20,
    fontWeight: 600,
  },
});
