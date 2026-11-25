import { useThemeColor } from "@/components/themed";
import { themeColors } from "@/constants/style/Colors";
import { tHelper } from "@/translations/translationHelper";
import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { showEula } from "@/components/eula/EulaGate";
import { useRef } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CIRCLE_SIZE = 128;
const LOGO_SIZE = 100;

/**
 * Capture screen header: a black band (it also fills the status-bar area) with
 * the 5010 logo in a red-ringed white circle, the app name, and a small caption
 * for the current collection mode. Double-tapping the logo opens the EULA.
 */
export function BrandHeader({ caption }: { caption?: string }) {
  const insets = useSafeAreaInsets();
  const topBar = useThemeColor({}, "topBar");
  const focused = useIsFocused();
  // Double-tap the logo to read the End-User License Agreement again (as on Android).
  const lastTap = useRef(0);
  const onLogoPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 400) {
      lastTap.current = 0;
      showEula();
    } else {
      lastTap.current = now;
    }
  };

  return (
    <View
      style={[
        styles.band,
        { paddingTop: insets.top + 10, backgroundColor: topBar },
      ]}
    >
      {focused ? <StatusBar style="light" /> : null}
      <Pressable onPress={onLogoPress} accessibilityLabel={tHelper("eulaTitle")}>
        <View style={styles.circle}>
        <Image
          source={require("@/assets/images/logo-600.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel={tHelper("companyLogo")}
        />
        </View>
      </Pressable>
      <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
        {tHelper("appName")}
      </Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 4,
    borderColor: themeColors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginBottom: 4,
  },
  name: {
    marginTop: 12,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  caption: {
    marginTop: 4,
    color: themeColors.red,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
