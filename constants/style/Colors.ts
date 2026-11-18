export const themeColors = {
  blue: "#005288",
  gray: "#c0c2c4",
  darkGray: "#5a5b5d",
  red: "#c41230",
  lightBlue: "#0078ae",
  green: "#5e9732",
};

const tintColorLight = themeColors.blue;

export default {
  light: {
    text: "#333333",
    textDisabled: "#33333380",
    primary: themeColors.blue,
    secondary: themeColors.darkGray,
    textInverse: "#ffffff",
    background: "#f8f8f9",
    tint: tintColorLight,
    danger: themeColors.red,
    warning: "#f39c11",
    success: themeColors.green,
    tabIconDefault: "#ffffff85",
    tabIconSelected: "#ffffff",
    transparent: "#ffffff00",
  },
  dark: {
    text: "#333333",
    textDisabled: "#33333380",
    primary: themeColors.blue,
    secondary: themeColors.darkGray,
    textInverse: "#ffffff",
    background: "#f8f8f9",
    tint: tintColorLight,
    danger: themeColors.red,
    warning: "#f39cc11",
    success: themeColors.green,
    tabIconDefault: "#ffffff85",
    tabIconSelected: "#ffffff",
    transparent: "#00000000",
  },
  // dark: {
  //   text: "#33333",
  //   primary: themeColors.gray,
  //   textInverse: "#ffffff",
  //   background: "#040404",
  //   tint: tintColorDark,
  //   danger: themeColors.red,
  //   tabIconDefault: "#00000090",
  //   tabIconSelected: "#000000",
  // },
};
