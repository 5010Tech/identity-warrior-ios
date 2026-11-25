import { Text, useThemeColor, View } from "@/components/themed";
import { tHelper, translationKey } from "@/translations/translationHelper";
import { Finger } from "@/types";
import { Base64Image, FGP, NFIQScore } from "@/types/BiometricData";
import { mapToFingerType } from "@/types/util";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { useCaptureValue } from "./context/hooks";
import { Hand } from "./fingerButtons";

/** Left Hand / Right Hand tabs, as at the top of the Android screen. */
export const HandTabs = ({
  hand,
  onChange,
}: {
  hand: Hand;
  onChange: (hand: Hand) => void;
}) => {
  const bar = useThemeColor({}, "surfaceAlt");
  const stroke = useThemeColor({}, "stroke");
  const text = useThemeColor({}, "textStrong");
  const muted = useThemeColor({}, "textMuted");
  const accent = useThemeColor({}, "accent");
  return (
    <View style={[styles.tabs, { backgroundColor: bar, borderColor: stroke }]}>
      {(["left", "right"] as Hand[]).map((tab) => {
        const selected = tab === hand;
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={styles.tab}
            onPress={() => onChange(tab)}
          >
            <Text
              style={[styles.tabText, { color: selected ? text : muted }]}
            >
              {tHelper(tab === "left" ? "leftHand" : "rightHand")}
            </Text>
            <View
              style={[
                styles.indicator,
                { backgroundColor: selected ? accent : "transparent" },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

/** One capture button: fingerprint icon and what it captures. */
export const FingerButtonCard = ({
  label,
  onPress,
  icon = "fingerprint",
  mirrored,
  disabled,
  onOmit,
}: {
  label: translationKey;
  onPress: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Flip the icon left to right (a right hand from the left-hand glyph). */
  mirrored?: boolean;
  disabled?: boolean;
  /** Shows an Omit button on the card (fingers that can't be printed). */
  onOmit?: () => void;
}) => {
  const surface = useThemeColor({}, "surface");
  const stroke = useThemeColor({}, "strokeStrong");
  const text = useThemeColor({}, "textStrong");
  const accent = useThemeColor({}, "accent");
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: surface, borderColor: stroke },
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={44}
        color={accent}
        style={mirrored ? styles.mirrored : undefined}
      />
      <Text style={[styles.cardText, { color: text }]}>{tHelper(label)}</Text>
      {onOmit ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onOmit}
          style={({ pressed }) => [
            styles.omit,
            { borderColor: stroke },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.omitText, { color: text }]}>
            {tHelper("omit")}
          </Text>
        </Pressable>
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={26} color={stroke} />
      )}
    </Pressable>
  );
};

/**
 * NFIQ badge wording and colors, exactly as on Android (LeftHandFragment):
 * 1 BEST, 2 GOOD, 3 MEDIUM, 4 POOR, 5 WORST. A finger that could not be
 * printed shows its reason on red.
 */
const BADGES: Record<number, { label: translationKey; bg: string; fg: string }> = {
  [NFIQScore.EXCELLENT]: { label: "nfiqBest", bg: "#00FF00", fg: "#000000" },
  [NFIQScore.VERY_GOOD]: { label: "nfiqGood", bg: "#228B22", fg: "#000000" },
  [NFIQScore.GOOD]: { label: "nfiqMedium", bg: "#FFFF00", fg: "#000000" },
  [NFIQScore.FAIR]: { label: "nfiqPoor", bg: "#CD5C5C", fg: "#000000" },
  [NFIQScore.POOR]: { label: "nfiqWorst", bg: "#FF0000", fg: "#000000" },
};

const badgeOf = (finger: Finger): { text: string; bg: string; fg: string } => {
  const missing = finger.missingFingerprints?.[0];
  if (missing) {
    return {
      text: tHelper(missing.reason === "XX" ? "amputation" : "unableToPrint"),
      bg: "#FF0000",
      fg: "#FFFFFF",
    };
  }
  const badge = BADGES[Number(finger.nfiqs?.[0]?.nfiq)];
  return badge
    ? { text: tHelper(badge.label), bg: badge.bg, fg: badge.fg }
    : { text: tHelper("captured"), bg: "#228B22", fg: "#000000" };
};

const IMAGE_HEIGHT = 112;

/** A captured finger: name, print and quality. Tap to capture it again. */
export const FingerResultTile = ({
  fingerPosition,
  name,
  finger,
  onPress,
  png,
  imageHeight = IMAGE_HEIGHT,
}: {
  /** Height of the print, so a hand's prints can be sized to fit the screen. */
  imageHeight?: number;
  fingerPosition: FGP;
  name: translationKey;
  finger: Finger;
  /** Omit for a tile that is only shown (the review before saving). */
  onPress?: () => void;
  /** The print to show, for a capture that isn't saved yet. */
  png?: Base64Image;
}) => {
  const savedPng = useCaptureValue<Base64Image>(
    `pngFingers.${mapToFingerType(fingerPosition)}`,
  );
  const pngImage = png ?? savedPng;
  const badge = badgeOf(finger);
  const surface = useThemeColor({}, "surface");
  const stroke = useThemeColor({}, "stroke");
  const text = useThemeColor({}, "textStrong");
  const danger = useThemeColor({}, "danger");
  const success = useThemeColor({}, "success");
  const missing = !!finger.missingFingerprints?.length;
  const hasImage = !missing && !!finger.image && pngImage !== "captured";
  const aspect = (finger.imageWidth ?? 1) / (finger.imageHeight || 1);

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: surface, borderColor: stroke },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.tileName, { color: text }]}>{tHelper(name)}</Text>
      <View style={[styles.print, { height: imageHeight }]}>
        {hasImage ? (
          <Image
            resizeMode="contain"
            style={{
              height: imageHeight,
              width: Math.min(150, imageHeight * aspect),
            }}
            source={{ uri: `data:image/png;base64,${pngImage}` }}
          />
        ) : (
          <MaterialCommunityIcons
            name={missing ? "close" : "fingerprint"}
            size={Math.min(72, imageHeight)}
            color={missing ? danger : success}
          />
        )}
      </View>
      <Text
        style={[
          styles.score,
          { color: badge.fg, backgroundColor: badge.bg },
        ]}
      >
        {badge.text}
      </Text>
    </Pressable>
  );
};

/**
 * One saved print, full screen on white: pinch to zoom, drag to move. Opened
 * from the left / right hand view, with Recapture and Done at the bottom.
 */
export const PrintViewer = ({
  print,
  onRecapture,
  onClose,
}: {
  /** The print to show; null keeps the viewer closed. */
  print: { title: translationKey; png?: Base64Image } | null;
  onRecapture: () => void;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  // The app's theme around the print; the print itself stays on its white.
  const background = useThemeColor({}, "background");
  const titleColor = useThemeColor({}, "textStrong");
  return (
    <Modal visible={!!print} animationType="fade" presentationStyle="fullScreen">
      <View
        style={[
          styles.viewer,
          {
            backgroundColor: background,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <Text style={[styles.viewerTitle, { color: titleColor }]}>
          {print ? tHelper(print.title) : ""}
        </Text>
        <ScrollView
          style={styles.enlargedScroll}
          contentContainerStyle={styles.enlargedContent}
          maximumZoomScale={8}
          minimumZoomScale={1}
          bouncesZoom
          centerContent
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {print?.png && print.png !== "captured" ? (
            <Image
              resizeMode="contain"
              style={{
                width: window.width,
                height: window.height - insets.top - insets.bottom - 190,
              }}
              source={{ uri: `data:image/png;base64,${print.png}` }}
            />
          ) : (
            <View style={styles.viewerEmpty}>
              <MaterialCommunityIcons name="close" size={96} color="#C62828" />
            </View>
          )}
        </ScrollView>
        <View style={styles.viewerButtons}>
          <Button
            variant="secondary"
            icon="camera-retake-outline"
            text={tHelper("recapture")}
            style={styles.viewerButton}
            onPress={onRecapture}
          />
          <Button
            text={tHelper("done")}
            style={styles.viewerButton}
            onPress={onClose}
          />
        </View>
      </View>
    </Modal>
  );
};

/** Why a finger has no print: amputation (XX) or unable to print (UP). */
export type MissingReason = "XX" | "UP";

/** The rows of the review, each laid out the way the hand was presented. */
const REVIEW_ROWS: { title: translationKey; fingers: FGP[] }[] = [
  {
    title: "rightHandSlap",
    fingers: [FGP.RIGHT_INDEX, FGP.RIGHT_MIDDLE, FGP.RIGHT_RING, FGP.RIGHT_LITTLE],
  },
  {
    title: "leftHandSlap",
    fingers: [FGP.LEFT_LITTLE, FGP.LEFT_RING, FGP.LEFT_MIDDLE, FGP.LEFT_INDEX],
  },
  { title: "thumbs", fingers: [FGP.LEFT_THUMB, FGP.RIGHT_THUMB] },
];

/**
 * Review of a contactless capture before it is saved: Recapture at the top,
 * the prints as a block of white squares each with its colored NFIQ card,
 * Save Image at the bottom. Tapping a print opens it full screen, where it
 * can be pinched to zoom.
 */
export const FingerReview = ({
  fingers,
  pngs,
  slapPng,
  onRecapture,
  onSave,
}: {
  fingers: Finger[] | null;
  pngs: Record<string, Base64Image>;
  /**
   * MAP and CAR: the slap as one four-finger image. Shown whole, with each
   * finger's quality under it in place of the separate prints.
   */
  slapPng?: Base64Image;
  onRecapture: () => void;
  /** The reason chosen for each finger marked missing, by finger position. */
  onSave: (reasons: Partial<Record<number, MissingReason>>) => void;
}) => {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const muted = useThemeColor({}, "textMuted");
  const danger = useThemeColor({}, "danger");
  // Each finger marked missing during the capture needs its own reason
  // before saving (one may be amputated, another bandaged). Tapping the
  // finger switches between the two.
  const missingPositions = (fingers ?? [])
    .filter((finger) => finger.missingFingerprints?.length)
    .map((finger) => Number(finger.fingerPosition));
  const [reasons, setReasons] = useState<Partial<Record<number, MissingReason>>>(
    {},
  );
  const [needReason, setNeedReason] = useState(false);
  useEffect(() => {
    setReasons({});
    setNeedReason(false);
  }, [fingers]);
  const switchReason = (fgp: number) =>
    setReasons((current) => ({
      ...current,
      [fgp]: current[fgp] === "UP" ? "XX" : "UP",
    }));
  const save = () => {
    if (missingPositions.some((fgp) => !reasons[fgp])) {
      setNeedReason(true);
      return;
    }
    onSave(reasons);
  };
  const background = useThemeColor({}, "background");
  const labelColor = useThemeColor({}, "textStrong");
  // The print opened full screen for a closer look, if any.
  const [enlarged, setEnlarged] = useState<Base64Image | null>(null);
  useEffect(() => {
    if (!fingers) setEnlarged(null);
  }, [fingers]);
  const rows = REVIEW_ROWS.map(({ title, fingers: positions }) => ({
    title,
    cells: positions.flatMap((fgp) => {
      const finger = (fingers ?? []).find(
        (f) => Number(f.fingerPosition) === fgp,
      );
      return finger ? [{ fgp, finger }] : [];
    }),
  })).filter((row) => row.cells.length);
  return (
    <Modal visible={!!fingers} animationType="slide" presentationStyle="fullScreen">
      <View
        style={[
          styles.review,
          {
            backgroundColor: background,
            paddingTop: insets.top + 15,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <Button
          icon="camera-retake-outline"
          text={tHelper("recapture")}
          style={styles.reviewButton}
          onPress={onRecapture}
        />
        {/* Each print in its own white square with its NFIQ card under it,
            as a block in the middle of the screen. Tap one to enlarge it. */}
        <View style={styles.reviewBody}>
          {!!slapPng && (
            <Pressable
              style={styles.slapBox}
              onPress={() => setEnlarged(slapPng)}
            >
              <Image
                resizeMode="contain"
                style={styles.printImage}
                source={{ uri: `data:image/png;base64,${slapPng}` }}
              />
            </Pressable>
          )}
          {rows.map(({ title, cells }) => (
            <View key={title} style={styles.printGrid}>
              {cells.map(({ fgp, finger }) => {
                const missing = !!finger.missingFingerprints?.length;
                // A missing finger shows its reason; tapping it switches it.
                const reason = reasons[fgp];
                const badge = missing
                  ? {
                      text: tHelper(
                        reason === "XX"
                          ? "amputation"
                          : reason === "UP"
                            ? "unableToPrint"
                            : "tapToSetReason",
                      ),
                      bg: reason ? "#FF0000" : "#FFFFFF",
                      fg: reason ? "#FFFFFF" : "#C62828",
                    }
                  : badgeOf(finger);
                const png = pngs[mapToFingerType(fgp)];
                return (
                  <Pressable
                    key={fgp}
                    style={slapPng ? styles.slapCell : styles.printCell}
                    disabled={!missing && (!png || !!slapPng)}
                    onPress={() =>
                      missing ? switchReason(fgp) : setEnlarged(png)
                    }
                  >
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[styles.printLabel, { color: labelColor }]}
                    >
                      {tHelper(String(fgp) as translationKey)}
                    </Text>
                    {/* With the slap shown whole, a finger is its name and
                        quality only (or its mark, if it is missing). */}
                    <View
                      style={[
                        styles.printBox,
                        !!slapPng && !missing && styles.hidden,
                      ]}
                    >
                      {png && !missing ? (
                        <Image
                          resizeMode="contain"
                          style={styles.printImage}
                          source={{ uri: `data:image/png;base64,${png}` }}
                        />
                      ) : (
                        <>
                          <MaterialCommunityIcons
                            name={missing ? "close" : "fingerprint"}
                            size={56}
                            color={missing ? "#C62828" : "#52606D"}
                          />
                          {missing && (
                            <MaterialCommunityIcons
                              name="swap-horizontal"
                              size={24}
                              color="#52606D"
                            />
                          )}
                        </>
                      )}
                    </View>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[
                        styles.qualityCard,
                        { color: badge.fg, backgroundColor: badge.bg },
                      ]}
                    >
                      {badge.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        {!!missingPositions.length && (
          <View style={styles.reasonBlock}>
            <Text style={[styles.reasonPrompt, { color: labelColor }]}>
              {tHelper("fingerOmitPrompt")}
            </Text>
            <Text style={[styles.reasonText, { color: muted }]}>
              {tHelper("tapMissingFinger")}
            </Text>
            {needReason && (
              <Text style={[styles.reasonError, { color: danger }]}>
                {tHelper("selectionRequired")}
              </Text>
            )}
          </View>
        )}
        <Button
          icon="content-save-outline"
          text={tHelper("saveImage")}
          style={styles.reviewButton}
          onPress={save}
        />
        {/* One print, full screen: pinch to zoom, drag to move. Done at the
            bottom (or a tap on the print) goes back to the review. */}
        {!!enlarged && (
          <View
            style={[
              styles.enlarged,
              {
                // The app's theme; the print itself stays on its own white.
                backgroundColor: background,
                paddingTop: insets.top,
                paddingBottom: insets.bottom + 8,
              },
            ]}
          >
            <ScrollView
              style={styles.enlargedScroll}
              contentContainerStyle={styles.enlargedContent}
              maximumZoomScale={8}
              minimumZoomScale={1}
              bouncesZoom
              centerContent
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              <Pressable onPress={() => setEnlarged(null)}>
                <Image
                  resizeMode="contain"
                  style={{
                    width: window.width,
                    height: window.height - insets.top - insets.bottom - 80,
                  }}
                  source={{ uri: `data:image/png;base64,${enlarged}` }}
                />
              </Pressable>
            </ScrollView>
            <Button
              text={tHelper("done")}
              style={styles.reviewButton}
              onPress={() => setEnlarged(null)}
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  review: { flex: 1, paddingHorizontal: 12, gap: 12 },
  // The block of prints, centered between the two buttons.
  reviewBody: {
    flex: 1,
    justifyContent: "center",
    gap: 14,
    backgroundColor: "transparent",
  },
  // Two to a row: four fingers make a 2 x 2 block, a lone thumb sits centered.
  printGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "transparent",
  },
  reasonBlock: { gap: 4, backgroundColor: "transparent" },
  reasonPrompt: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  reasonText: { fontSize: 14, textAlign: "center" },
  reasonError: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  printCell: { width: "46%", gap: 6 },
  // Four across, under the whole slap.
  slapCell: { width: "22%", gap: 6 },
  slapBox: {
    width: "100%",
    aspectRatio: 1.07,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 6,
  },
  hidden: { display: "none" },
  printLabel: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  // White only behind the print itself.
  printBox: {
    aspectRatio: 0.9,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  printImage: { width: "100%", height: "100%" },
  qualityCard: {
    paddingVertical: 6,
    borderRadius: 6,
    overflow: "hidden",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
  },
  enlarged: { ...StyleSheet.absoluteFillObject },
  viewer: { flex: 1, gap: 8 },
  viewerTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  viewerEmpty: {
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  viewerButtons: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
  },
  viewerButton: { flex: 1 },
  enlargedScroll: { flex: 1 },
  enlargedContent: { flexGrow: 1, justifyContent: "center" },
  reviewButton: { alignSelf: "center", minWidth: 240 },

  tabs: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  tab: { flex: 1, alignItems: "center", paddingTop: 12 },
  tabText: { fontSize: 16, fontWeight: "700", paddingBottom: 9 },
  indicator: { height: 4, alignSelf: "stretch" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 68,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  cardText: { flex: 1, fontSize: 17, fontWeight: "600" },
  omit: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 18,
  },
  omitText: { fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.6 },
  mirrored: { transform: [{ scaleX: -1 }] },
  // Two to a row; one alone on its row (the thumb) is the same size, centered.
  tile: {
    width: "48%",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  tileName: { fontSize: 15, fontWeight: "600" },
  print: {
    height: IMAGE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  score: {
    alignSelf: "stretch",
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
  },
});
