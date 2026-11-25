import { Pressable, StyleSheet, Switch, View } from "react-native";
import { Text, useThemeColor } from "../themed";

interface InputToggleProps {
  onChange: (...e: any[]) => void;
  required?: boolean;
  error?: string;
  label?: string;
  /** Smaller explanatory text under the label. */
  hint?: string;
  value?: boolean;
}

/** A switch row: label on the left, switch on the right, optional hint below. */
export const InputToggle = ({
  onChange,
  error,
  label,
  hint,
  value,
}: InputToggleProps) => {
  const toggleOn = useThemeColor({}, "toggleOn");
  const labelColor = useThemeColor({}, "text");
  const hintColor = useThemeColor({}, "textMuted");
  const errorColor = useThemeColor({}, "danger");
  return (
    <View style={styles.container}>
      <Pressable
        style={styles.row}
        onPress={() => onChange(!value)}
        accessibilityRole="switch"
        accessibilityState={{ checked: !!value }}
      >
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        <Switch
          trackColor={{ true: toggleOn }}
          value={!!value}
          onValueChange={onChange}
        />
      </Pressable>
      {hint ? <Text style={[styles.hint, { color: hintColor }]}>{hint}</Text> : null}
      {error ? <Text style={{ color: errorColor }}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: "100%", gap: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    gap: 12,
  },
  label: { fontSize: 18, flexShrink: 1 },
  hint: { fontSize: 14 },
});
