import Colors from "@/constants/style/Colors";
import { DarkTheme, DefaultTheme, Theme } from "@react-navigation/native";

/** React Navigation themes built from the Identity Warrior palette, so stack
 *  headers, screen backgrounds and borders match the rest of the app. */
const build = (base: Theme, c: typeof Colors.light): Theme => ({
  ...base,
  colors: {
    ...base.colors,
    primary: c.primary,
    background: c.background,
    card: c.surface,
    text: c.textStrong,
    border: c.stroke,
    notification: c.accent,
  },
});

export const IWLightTheme = build(DefaultTheme, Colors.light);
export const IWDarkTheme = build(DarkTheme, Colors.dark);
