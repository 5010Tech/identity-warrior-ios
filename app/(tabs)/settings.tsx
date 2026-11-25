import { IconName } from "@/components/Button";
import { SectionHeader } from "@/components/Section";
import { SafeAreaView, Text, useThemeColor } from "@/components/themed";
import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { tHelper } from "@/translations/translationHelper";
import { useLicense } from "@/features/license/LicenseGate";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Href, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

interface SettingsItem {
  icon: IconName;
  title: string;
  summary: string;
  href: Href;
}

/**
 * Settings home, laid out like the Android app's settings.xml: grouped cards of
 * rows, each with an icon tile, title, summary and chevron.
 */
export default function SettingsScreen() {
  // DoD or DHS, chosen at the top of App Settings.
  const isDod = useAutofillSelector(
    (s) => s.appSettings?.collectionMode !== "DHS",
  );
  const license = useLicense();
  const sections: { title: string; items: SettingsItem[] }[] = [
    {
      title: tHelper("settingsSectionApplication"),
      items: [
        {
          icon: "tune-variant",
          title: tHelper("appSettings"),
          summary: tHelper("appSettingsSummary"),
          href: "/settings/appSettings",
        },
        {
          icon: "license",
          title: tHelper("settingsLicenseTitle"),
          summary: license?.expiration
            ? `${tHelper("licenseExpirationLabel")} ${license.expiration}`
            : tHelper("importLicense"),
          href: "/settings/license",
        },
      ],
    },
    {
      title: tHelper("settingsSectionTransaction"),
      items: [
        {
          icon: "script-text-outline",
          title: isDod ? tHelper("type1") : tHelper("submissionSettings"),
          summary: isDod
            ? tHelper("type1Summary")
            : tHelper("submissionSettingsSummary"),
          href: isDod
            ? "/settings/type1Settings"
            : "/settings/submissionSettings",
        },
        {
          icon: "card-account-details-outline",
          title: isDod ? tHelper("type2") : tHelper("autofillSettings"),
          summary: isDod
            ? tHelper("type2Summary")
            : tHelper("autofillSettingsSummary"),
          href: isDod
            ? "/settings/type2Settings"
            : "/settings/autofillSettings",
        },
      ],
    },
    {
      title: tHelper("settingsSectionConnections"),
      items: [
        isDod
          ? {
              icon: "server-network",
              title: tHelper("dodAbis"),
              summary: tHelper("dodAbisSummary"),
              href: "/settings/abisSettings",
            }
          : {
              icon: "server-network",
              title: tHelper("ixmApiSettings"),
              summary: tHelper("apiSettingsSummary"),
              href: "/apiSettings",
            },
        {
          icon: "cellphone-link",
          title: tHelper("devices"),
          summary: tHelper("devicesSummary"),
          href: "/devices",
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <SectionHeader title={section.title} />
            <SettingsGroup items={section.items} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsGroup({ items }: { items: SettingsItem[] }) {
  const router = useRouter();
  const surface = useThemeColor({}, "surface");
  const stroke = useThemeColor({}, "stroke");
  const divider = useThemeColor({}, "divider");
  const tile = useThemeColor({}, "surfaceAlt");
  const icon = useThemeColor({}, "icon");
  const title = useThemeColor({}, "textStrong");
  const summary = useThemeColor({}, "textSecondary");

  return (
    <View
      style={[styles.group, { backgroundColor: surface, borderColor: stroke }]}
    >
      {items.map((item, index) => (
        <Pressable
          key={item.title}
          onPress={() => router.navigate(item.href)}
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
        >
          <View style={[styles.tile, { backgroundColor: tile }]}>
            <MaterialCommunityIcons name={item.icon} size={26} color={icon} />
          </View>
          <View
            style={[
              styles.rowBody,
              index > 0 && {
                borderTopWidth: StyleSheet.hairlineWidth * 2,
                borderTopColor: divider,
              },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.title, { color: title }]}>{item.title}</Text>
              <Text style={[styles.summary, { color: summary }]}>
                {item.summary}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={28}
              color={summary}
            />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  section: { gap: 8, marginBottom: 14 },
  group: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 72,
    paddingVertical: 10,
    paddingRight: 12,
  },
  rowText: { flex: 1 },
  title: { fontSize: 20, fontWeight: "700" },
  summary: { fontSize: 15, marginTop: 2 },
});
