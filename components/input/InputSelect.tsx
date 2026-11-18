import { FontAwesome } from "@expo/vector-icons";
import { tHelper } from "@/translations/translationHelper";
import { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Text, useThemeColor } from "../themed";
import { InputParent } from "./InputParent";
import { inputStyles } from "./styles";

export interface SelectOption {
  label: string;
  value: string;
}

interface InputSelectProps extends Omit<TextInputProps, "onChange" | "style"> {
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  label?: string;
  items?: SelectOption[];
  value?: string;
  placeholderLabel?: string;
  placeholdervalue?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export const InputSelect = ({
  onChange,
  required,
  error,
  label,
  style,
  items = [],
  value,
  placeholderLabel = "Select an option...",
  placeholdervalue = "",
  disabled = false,
}: InputSelectProps) => {
  const [focused, setFocus] = useState(false);
  const [open, setOpen] = useState(false);
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "textDisabled");
  const surfaceColor = useThemeColor({}, "background");

  const selectedItem = useMemo(
    () => items.find((item) => item.value === value),
    [items, value],
  );

  const displayLabel = selectedItem?.label ?? placeholderLabel;

  const isPlaceholder = !selectedItem;

  const openPicker = () => {
    if (disabled) return;
    setFocus(true);
    setOpen(true);
  };

  const closePicker = () => {
    setOpen(false);
    setFocus(false);
  };

  const handleValueChange = (nextValue: string) => {
    if (nextValue === placeholdervalue || nextValue == null) {
      onChange("");
      return;
    }

    onChange(nextValue);
  };

  return (
    <>
      <InputParent
        label={label}
        error={error}
        required={required}
        focused={focused}
        onPress={openPicker}
        disabled={disabled}
      >
        <Pressable
          onPress={openPicker}
          disabled={disabled}
          style={[styles.input, style, disabled && styles.disabledInput]}
          accessibilityRole="button"
          accessibilityState={{ disabled, expanded: open }}
        >
          <Text
            style={[
              styles.inputText,
              { color: isPlaceholder ? mutedColor : textColor },
            ]}
            numberOfLines={1}
          >
            {displayLabel}
          </Text>

          <FontAwesome
            name="chevron-down"
            size={14}
            color={disabled ? mutedColor : textColor}
          />
        </Pressable>
      </InputParent>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
      >
        <Pressable style={styles.backdrop} onPress={closePicker} />

        <View style={[styles.sheet, { backgroundColor: surfaceColor }]}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={closePicker} hitSlop={8}>
              <Text style={styles.sheetAction}>
                {tHelper("done") || "Done"}
              </Text>
            </Pressable>
          </View>

          <Picker
            selectedValue={value ?? placeholdervalue}
            onValueChange={handleValueChange}
            enabled={!disabled}
            itemStyle={styles.pickerItem}
          >
            <Picker.Item
              label={placeholderLabel}
              value={placeholdervalue}
              color={Platform.OS === "ios" ? undefined : undefined}
            />
            {items.map((item) => (
              <Picker.Item
                key={item.value}
                label={item.label}
                value={item.value}
              />
            ))}
          </Picker>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    ...inputStyles.input,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  disabledInput: {
    opacity: 0.6,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D1D1D6",
  },
  sheetAction: {
    fontSize: 17,
    fontWeight: "600",
  },
  pickerItem: {
    fontSize: 16,
  },
});
