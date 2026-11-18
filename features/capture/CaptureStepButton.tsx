import { Text, useThemeColor, View } from "@/components/themed";
import { themeColors } from "@/constants/style/Colors";
import { FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, Link } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, TouchableOpacity } from "react-native";
import { Switch } from "react-native-gesture-handler";
import { tHelper } from "@/translations/translationHelper";

interface CaptureStepButtonProps {
  icon: React.ComponentProps<
    typeof FontAwesome | typeof MaterialCommunityIcons
  >["name"];
  path: Href;
  title: string;
  completed: boolean;
  enabled?: boolean;
  onEnabledChange: (enabled: boolean) => void;
  canToggle?: boolean;
}

export const CaptureStepButton = ({
  icon,
  path,
  title,
  completed,
  enabled,
  onEnabledChange,
  canToggle,
}: CaptureStepButtonProps) => {
  const handleEnabledChange = () => {
    onEnabledChange(!enabled);
  };
  const primary = useThemeColor({}, "primary");

  const iconComponent = useMemo(() => {
    const faGlyphs = FontAwesome.getRawGlyphMap
      ? FontAwesome.getRawGlyphMap()
      : (FontAwesome as any).glyphMap;

    if (faGlyphs && faGlyphs.hasOwnProperty(icon)) {
      return (
        <FontAwesome
          name={icon as React.ComponentProps<typeof FontAwesome>["name"]}
          size={32}
          color={"#fff"}
        />
      );
    }

    return (
      <MaterialCommunityIcons
        name={
          icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]
        }
        size={32}
        color={"#fff"}
      />
    );
  }, [icon]);

  return (
    <View style={styles.container}>
      <Link disabled={!enabled} href={path} asChild>
        <TouchableOpacity disabled={!enabled} style={styles.button}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: primary,
                opacity: enabled ? 1 : 0.7,
              },
            ]}
          >
            {iconComponent}
          </View>
          <Text style={[styles.title, { opacity: enabled ? 1 : 0.7 }]}>
            {title}
          </Text>
        </TouchableOpacity>
      </Link>
      <View style={styles.rightCol}>
        {canToggle && (
          <Pressable
            hitSlop={5}
            style={styles.switchContainer}
            onPress={handleEnabledChange}
          >
            <Text>{tHelper("enabled")}</Text>
            <Switch
              onValueChange={onEnabledChange}
              value={enabled}
              trackColor={{ true: primary }}
            />
          </Pressable>
        )}
        <FontAwesome
          name={
            enabled
              ? completed
                ? "check-circle"
                : "exclamation-circle"
              : "minus-circle"
          }
          color={
            enabled
              ? completed
                ? themeColors.green
                : themeColors.red
              : themeColors.gray
          }
          size={28}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    gap: 10,
    paddingVertical: 5,
  },
  iconContainer: {
    borderRadius: 4,
    padding: 7,
    minWidth: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: 500,
    flexGrow: 1,
  },
  rightCol: { gap: 10, flexDirection: "row", alignItems: "center" },
  switchContainer: { gap: 5 },
});
