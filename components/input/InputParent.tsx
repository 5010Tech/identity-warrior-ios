import { PropsWithChildren, useMemo } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { Text, useThemeColor } from "../themed";

interface InputParentProps {
  label?: string;
  error?: string;
  required?: boolean;
  focused?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
}

export const InputParent = ({
  children,
  label,
  error,
  focused,
  style,
  onPress,
  disabled,
}: PropsWithChildren<InputParentProps>) => {
  const errorColor = useThemeColor({}, "danger");
  const labelColor = useThemeColor({}, "textMuted");
  const focusedColor = useThemeColor({}, "textStrong");

  const color = useMemo(() => {
    if (focused) {
      return focusedColor;
    }
    if (error) {
      return errorColor;
    }
    return labelColor;
  }, [focused, error, labelColor, focusedColor, errorColor]);

  const content = (
    <>
      {/* No label, no blank line where it would have been. */}
      {label ? (
        <Text
          style={[
            styles.label,
            {
              color,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
      {children}
      {error && (
        <Text style={[styles.error, { color: errorColor }]}>{error}</Text>
      )}
    </>
  );

  return (
    <View style={[styles.container, style]}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          disabled={disabled}
          style={styles.pressable}
          accessibilityRole="button"
        >
          {content}
        </Pressable>
      ) : (
        content
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 5,
  },
  pressable: {
    gap: 5,
  },
  label: {
    fontWeight: "500",
    fontSize: 15,
  },
  error: {},
});
