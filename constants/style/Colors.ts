/**
 * Identity Warrior color palette, ported from the Android app
 * (identity-warrior-library/src/main/res/values{,-night}/colors.xml, the iw_* colors).
 *
 * The design is neutral black/white with 5010 red as the brand accent. Every token
 * has a light and a dark value; Dark Mode is chosen in App Settings, as on Android.
 */

/** Fixed brand / status colors that don't change between light and dark. */
export const themeColors = {
  red: "#D4242C", // 5010 red (iwa_red)
  black: "#000000",
  white: "#FFFFFF",
  green: "#198754", // match_green
  gray: "#9AA5B1",
  darkGray: "#52606D",
  omit: "#C77700", // iw_omit_icon
};

const light = {
  // ----- Surfaces -----
  background: "#ECEFF3", // iw_screen_bg: screen background behind cards
  surface: "#FFFFFF", // iw_surface: cards, panels, dialogs
  surfaceAlt: "#F5F6F8", // iw_surface_alt: wells inside a card
  stroke: "#D3D8DF", // iw_stroke: card and field outlines
  strokeStrong: "#9AA5B1", // iw_stroke_strong: outlined buttons, inputs
  divider: "#E4E7EB", // iw_divider

  // ----- Text -----
  textStrong: "#000000", // iw_text_strong
  text: "#1F2933", // iw_text_primary: headings and body
  textMuted: "#52606D", // iw_text_muted: labels
  textSecondary: "#6B7785", // iw_text_secondary: hints
  textDisabled: "#1F293380",
  textInverse: "#FFFFFF", // text on a primary/filled background
  statusText: "#808080", // iw_text_grey: Capture status line

  // ----- Controls -----
  primary: "#000000", // icons, focus, filled controls (Android colorPrimary)
  secondary: "#52606D",
  tint: "#000000",
  icon: "#000000", // iw_icon
  button: "#000000", // iw_button: filled buttons
  buttonDisabled: "#CBD2D9", // iw_button_disabled
  buttonText: "#FFFFFF", // iwa_button_primary_text
  link: "#0B5CAD", // iw_link
  progress: "#1F2933", // iw_progress
  toggleOn: "#000000", // iw_toggle_on

  // ----- Status -----
  danger: "#C62828", // iw_error
  dangerBg: "#FDECEC", // iw_error_bg
  success: "#2E7D32", // iw_success
  successBg: "#E8F5E9", // iw_success_bg
  warning: "#B26A00", // settings_status_warn
  warningBg: "#FFF3CD", // abis_msg
  accent: "#D4242C", // 5010 red

  // ----- Chrome -----
  topBar: "#000000", // the black bar behind the logo
  tabBar: "#FFFFFF", // bottom navigation (Android windowBackground)
  tabIconDefault: "#A9A9A9", // nav_item (unselected: darkgray)
  tabIconSelected: "#000000", // nav_item (selected: iw_text_strong)
  transparent: "#FFFFFF00",
};

const dark: typeof light = {
  background: "#121417",
  surface: "#1E2227",
  surfaceAlt: "#262B31",
  stroke: "#3A4049",
  strokeStrong: "#5A6470",
  divider: "#2C3138",

  textStrong: "#EEF1F4",
  text: "#E8EBEF",
  textMuted: "#AAB4BF",
  textSecondary: "#9AA5B1",
  textDisabled: "#E8EBEF80",
  textInverse: "#121417",
  statusText: "#9AA5B1",

  primary: "#E8EBEF",
  secondary: "#AAB4BF",
  tint: "#E8EBEF",
  icon: "#E8EBEF",
  button: "#3A4049",
  buttonDisabled: "#2C3138",
  buttonText: "#FFFFFF",
  link: "#8AB4F8",
  progress: "#9CC3FF",
  toggleOn: "#4C9AFF",

  danger: "#EF6C6C",
  dangerBg: "#3B1F21",
  success: "#66BB6A",
  successBg: "#1E3323",
  warning: "#FFB74D",
  warningBg: "#3D3520",
  accent: "#D4242C",

  topBar: "#000000",
  tabBar: "#2B2B2B",
  tabIconDefault: "#9AA5B1",
  tabIconSelected: "#EEF1F4",
  transparent: "#00000000",
};

export default { light, dark };
