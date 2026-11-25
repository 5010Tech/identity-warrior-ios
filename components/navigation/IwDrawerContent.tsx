import { IconName } from "@/components/Button";
import { Text, useThemeColor } from "@/components/themed";
import { tHelper } from "@/translations/translationHelper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface IwDrawerItem {
  label: string;
  icon: IconName;
  onPress: () => void;
}

export interface IwDrawerSection {
  /** Small heading above the group, with a divider (Android sub-menu title). */
  title?: string;
  items: IwDrawerItem[];
}

interface IwDrawerContentProps {
  /** White text under the logo in the black header. */
  title: string;
  sections: IwDrawerSection[];
}

/**
 * Slide-out menu styled like the Android app's NavigationView
 * (iwa_menu_header.xml + a menu): a black header with the 5010 logo and a
 * title, then rows of icon + label on the surface color, grouped under
 * optional sub-headings.
 */
export function IwDrawerContent({ title, sections }: IwDrawerContentProps) {
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, "surface");
  const header = useThemeColor({}, "topBar");
  const icon = useThemeColor({}, "icon");
  const text = useThemeColor({}, "text");
  const muted = useThemeColor({}, "textSecondary");
  const divider = useThemeColor({}, "divider");
  const pressedBg = useThemeColor({}, "surfaceAlt");

  return (
    <View style={[styles.drawer, { backgroundColor: surface }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: header, paddingTop: insets.top + 30 },
        ]}
      >
        <Image
          source={require("@/assets/images/logo-200.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel={tHelper("companyLogo")}
        />
        <Text style={styles.headerText}>{title}</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
      >
        {sections.map((section, index) => (
          <View key={section.title ?? index}>
            {section.title ? (
              <View style={[styles.subheader, { borderTopColor: divider }]}>
                <Text style={[styles.subheaderText, { color: muted }]}>
                  {section.title}
                </Text>
              </View>
            ) : null}
            {section.items.map((item) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: pressedBg },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={24}
                  color={icon}
                />
                <Text style={[styles.label, { color: text }]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: { flex: 1 },
  header: {
    alignItems: "center",
    paddingHorizontal: 30,
    paddingBottom: 30,
    gap: 10,
  },
  // The red logo straight on the black header, as on Android.
  logo: { width: 64, height: 64 },
  headerText: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
  },
  subheader: {
    marginTop: 8,
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  subheaderText: { fontSize: 14, fontWeight: "600" },
  // 56pt rows with the label 32pt in from the icon, as in a Material menu.
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 32,
    paddingHorizontal: 20,
  },
  label: { flex: 1, fontSize: 16, fontWeight: "600" },
});
