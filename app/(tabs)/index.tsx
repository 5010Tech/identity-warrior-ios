import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { BrandHeader } from "@/components/BrandHeader";
import { IconName } from "@/components/Button";
import { useActiveDevice } from "@/components/device/activeDevice";
import { Text, useThemeColor, View } from "@/components/themed";
import { CaptureTile } from "@/features/capture/CaptureTile";
import { tHelper, translationKey } from "@/translations/translationHelper";
import { useLicense } from "@/features/license/LicenseGate";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Href, Link, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  clearRecovery,
  findRecovery,
  requestRecovery,
  takeRecoveryPrompt,
} from "@/features/capture/recovery";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View as RNView,
} from "react-native";

interface CaptureAction {
  title: translationKey;
  icon: IconName;
  color: string;
  href: Href;
  /** Needs a fingerprint scanner: not offered on a contactless collection. */
  needsScanner?: boolean;
}

/**
 * Opens the capture flow. `dodTot` names the DoD transaction (it sets the
 * screen title); the flow underneath is still the DHS one of that type.
 */
const capture = (transactionType: string, dodTot?: string): Href => ({
  pathname: "/capture/[transactionType]",
  params: dodTot ? { transactionType, dodTot } : { transactionType },
});

/** DoD transactions, named as in the Android app. */
const DOD_ACTIONS: CaptureAction[] = [
  {
    title: "dprs",
    icon: "account-search",
    color: "#D4242C",
    href: capture("Identify", "dprs"),
  },
  // MAP and CAR take rolled prints as well as flats, which the phone camera
  // cannot do: they are offered only with a scanner in use.
  {
    title: "map",
    icon: "briefcase",
    color: "#1E9E6A",
    href: capture("Enroll", "map"),
    needsScanner: true,
  },
  {
    title: "car",
    icon: "gavel",
    color: "#E08A00",
    href: capture("Enroll", "car"),
    needsScanner: true,
  },
  {
    title: "latentFpCapture",
    icon: "fingerprint",
    color: "#2F6FDE",
    href: "/latent",
  },
];

const DHS_ACTIONS: CaptureAction[] = [
  {
    title: "verifyRequest",
    icon: "account-check",
    color: "#1E9E6A",
    href: capture("Verify"),
  },
  {
    title: "identifyRequest",
    icon: "account-search",
    color: "#D4242C",
    href: capture("Identify"),
  },
  {
    title: "enrollRequest",
    icon: "account-plus",
    color: "#2F6FDE",
    href: capture("Enroll"),
  },
];

/**
 * Capture home: a black header with the logo, app name and collection mode, a
 * status pill for the connected scanner (or contactless), then one
 * full-width colored tile per transaction (up to four fit without scrolling).
 */
export default function HomeScreen() {
  const { activeDevice } = useActiveDevice();
  // DoD or DHS, chosen at the top of App Settings.
  const isDod = useAutofillSelector(
    (s) => s.appSettings?.collectionMode !== "DHS",
  );
  const pillBg = useThemeColor({}, "surfaceAlt");
  const pillText = useThemeColor({}, "textStrong");
  const online = useThemeColor({}, "success");
  const chevron = useThemeColor({}, "textSecondary");

  const actions = isDod ? DOD_ACTIONS : DHS_ACTIONS;
  const license = useLicense();
  const router = useRouter();

  // A collection that was interrupted (a crash, or the operator leaving the
  // app) is still on the phone: offer to carry on with it, as on Android.
  // Asked once per app start.
  useEffect(() => {
    if (!isDod || !takeRecoveryPrompt()) return;
    let alive = true;
    findRecovery().then((saved) => {
      if (!alive || !saved) return;
      Alert.alert(tHelper("recoverTitle"), tHelper("recoverText"), [
        {
          text: tHelper("no"),
          style: "cancel",
          onPress: () => void clearRecovery("the operator said no"),
        },
        {
          text: tHelper("yes"),
          onPress: () => {
            requestRecovery();
            router.navigate({
              pathname: "/capture/[transactionType]",
              params: {
                transactionType: saved.transactionType,
                ...(saved.dodTot ? { dodTot: saved.dodTot } : {}),
              },
            });
          },
        },
      ]);
    });
    return () => {
      alive = false;
    };
  }, [isDod, router]);
  const badge = tHelper("collectionBadge").replace(
    "{mode}",
    tHelper(isDod ? "collectionModeDod" : "collectionModeDhs"),
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <BrandHeader caption={badge} />

        <Link href="/devices" asChild>
          {/* Link asChild replaces the Pressable's style, so the pill is an inner view. */}
          <Pressable accessibilityRole="link" style={styles.pillTouch}>
            <RNView style={[styles.pill, { backgroundColor: pillBg }]}>
            <RNView style={[styles.dot, { backgroundColor: online }]} />
            <Text
              style={[styles.pillText, { color: pillText }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {/* The model only: the serial number is not for this screen. */}
              {activeDevice
                ? (activeDevice.modelNumber ?? tHelper("devices"))
                : tHelper("contactlessEnabled")}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={chevron}
            />
            </RNView>
          </Pressable>
        </Link>

        <View style={styles.grid}>
          {actions
            // Latent capture only where the license allows it.
            .filter(
              ({ href }) => href !== "/latent" || license?.allowLatent !== false,
            )
            // Rolled prints need a scanner; contactless cannot take them.
            .filter(({ needsScanner }) => !needsScanner || !!activeDevice)
            .map((action) => (
            <RNView key={action.title} style={styles.row}>
              <Link href={action.href} asChild>
                <CaptureTile
                  title={tHelper(action.title)}
                  icon={action.icon}
                  color={action.color}
                />
              </Link>
            </RNView>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  pillTouch: { alignSelf: "center", marginTop: 16, maxWidth: "92%" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingLeft: 16,
    paddingRight: 10,
    borderRadius: 999,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  pillText: { flexShrink: 1, fontSize: 17, fontWeight: "700" },
  grid: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "transparent",
  },
  // Tiles share the free height, within limits, so they are all the same size.
  row: {
    flex: 1,
    flexDirection: "row",
    minHeight: 84,
    maxHeight: 108,
  },
});
