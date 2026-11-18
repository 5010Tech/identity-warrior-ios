/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import {
  TextProps as DefaultTextProps,
  ViewProps as DefaultViewProps,
  Text as DefaultText,
  View as DefaultView,
} from "react-native";

import {
  SafeAreaView as DefaultSafeAreaView,
  NativeSafeAreaViewProps,
} from "react-native-safe-area-context";

import Colors from "@/constants/style/Colors";
import { useColorScheme } from "../useColorScheme";

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultTextProps & { inverse?: boolean };
export type ViewProps = ThemeProps & DefaultViewProps;
export type SafeAreaViewProps = ThemeProps & NativeSafeAreaViewProps;
export type ThemeColorName = keyof typeof Colors.light &
  keyof typeof Colors.dark;

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ThemeColorName,
) {
  const theme = useColorScheme() ?? "light";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, inverse, ...otherProps } = props;
  const color = useThemeColor(
    { light: lightColor, dark: darkColor },
    inverse ? "textInverse" : "text",
  );

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background",
  );

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}

export const SafeAreaView = (props: SafeAreaViewProps) => {
  const {
    style,
    lightColor,
    darkColor,
    edges = ["top"],
    ...otherProps
  } = props;
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background",
  );

  return (
    <DefaultSafeAreaView
      style={[{ backgroundColor }, style]}
      edges={edges}
      {...otherProps}
    />
  );
};
