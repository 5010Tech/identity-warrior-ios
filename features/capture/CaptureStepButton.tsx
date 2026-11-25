import { Text, useThemeColor } from "@/components/themed";
import { FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, Link } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { tHelper } from "@/translations/translationHelper";

interface CaptureStepButtonProps {
  icon: React.ComponentProps<
    typeof FontAwesome | typeof MaterialCommunityIcons
  >["name"];
  path: Href;
  title: string;
  completed: boolean;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  canToggle?: boolean;
  /** Optional step: no status mark until something has been collected. */
  optional?: boolean;
  /** Tighter row (smaller icon and title) for screens with many steps. */
  compact?: boolean;
  /**
   * The step cannot be opened yet (its scanner is still connecting): greyed,
   * not pressable, with a wheel where the status mark goes.
   */
  busy?: boolean;
}

const FRAME = 56;
const CORNER = 12;

/** Icon inside four corner brackets, like the Android capture rows. */
function BracketIcon({
  color,
  compact,
  children,
}: React.PropsWithChildren<{ color: string; compact?: boolean }>) {
  const corner = { borderColor: color };
  return (
    <View style={[styles.frame, compact && styles.frameCompact]}>
      <View style={[styles.corner, styles.tl, corner]} />
      <View style={[styles.corner, styles.tr, corner]} />
      <View style={[styles.corner, styles.bl, corner]} />
      <View style={[styles.corner, styles.br, corner]} />
      {children}
    </View>
  );
}

/**
 * A capture step on the transaction screen, styled like the Android app:
 * large outlined row, bracketed icon, uppercase title and a status mark
 * (green double-check when complete, red alert when still required).
 */
export const CaptureStepButton = ({
  icon,
  path,
  title,
  completed,
  enabled = true,
  onEnabledChange,
  canToggle,
  optional,
  compact,
  busy,
}: CaptureStepButtonProps) => {
  const stroke = useThemeColor({}, "textStrong");
  const disabledStroke = useThemeColor({}, "strokeStrong");
  const surface = useThemeColor({}, "surface");
  const toggleOn = useThemeColor({}, "toggleOn");
  const success = useThemeColor({}, "success");
  const danger = useThemeColor({}, "danger");
  const muted = useThemeColor({}, "textSecondary");

  const color = enabled && !busy ? stroke : disabledStroke;

  const iconComponent = useMemo(() => {
    const faGlyphs = FontAwesome.getRawGlyphMap
      ? FontAwesome.getRawGlyphMap()
      : (FontAwesome as any).glyphMap;

    if (faGlyphs && faGlyphs.hasOwnProperty(icon)) {
      return (
        <FontAwesome
          name={icon as React.ComponentProps<typeof FontAwesome>["name"]}
          size={compact ? 22 : 28}
          color={color}
        />
      );
    }

    return (
      <MaterialCommunityIcons
        name={
          icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]
        }
        size={compact ? 26 : 32}
        color={color}
      />
    );
  }, [icon, color, compact]);

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        { borderColor: color, backgroundColor: surface },
      ]}
    >
      <Link disabled={!enabled || busy} href={path} asChild>
        <TouchableOpacity disabled={!enabled || busy} style={styles.button}>
          <BracketIcon color={color} compact={compact}>
            {iconComponent}
          </BracketIcon>
          <Text
            style={[styles.title, compact && styles.titleCompact, { color }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {title}
          </Text>
        </TouchableOpacity>
      </Link>
      <View style={styles.rightCol}>
        {canToggle && (
          <Switch
            onValueChange={onEnabledChange}
            value={enabled}
            trackColor={{ true: toggleOn }}
            accessibilityLabel={tHelper("enabled")}
          />
        )}
        {busy && enabled ? (
          <ActivityIndicator
            size="small"
            color={muted}
            style={styles.wheel}
            accessibilityLabel={tHelper("connectingToDevice")}
          />
        ) : optional && !completed ? null : (
          <MaterialCommunityIcons
            name={
              enabled
                ? completed
                  ? "check-all"
                  : "alert-circle-outline"
                : "minus-circle-outline"
            }
            color={enabled ? (completed ? success : danger) : muted}
            size={34}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    // Rows share the available height: as tall as 82pt when there is room.
    flex: 1,
    minHeight: 66,
    maxHeight: 82,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 14,
    gap: 8,
  },
  containerCompact: {
    minHeight: 50,
    borderRadius: 14,
  },
  frameCompact: {
    width: 44,
    height: 44,
  },
  titleCompact: {
    fontSize: 16,
    letterSpacing: 1,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
    paddingVertical: 4,
  },
  frame: {
    width: FRAME,
    height: FRAME,
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  wheel: { width: 34, height: 34 },
  rightCol: { gap: 8, flexDirection: "row", alignItems: "center" },
});
