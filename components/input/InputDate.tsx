import { FontAwesome } from "@expo/vector-icons";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import DateTimePicker from "react-native-modal-datetime-picker";
import { Text, useThemeColor } from "../themed";
import { InputParent } from "./InputParent";
import { inputStyles, useInputColors } from "./styles";

interface InputDateProps {
  onChange: (...e: any[]) => void;
  required?: boolean;
  error?: string;
  label?: string;
  value?: Date;
  min?: Date;
  max?: Date;
  type?: "datetime" | "date" | "time";
  displayFormat?: string;
  /** Shown, muted, while no date is set. */
  placeholder?: string;
}

export const InputDate = ({
  label,
  error,
  required,
  onChange,
  min,
  max,
  value,
  type = "date",
  displayFormat,
  placeholder,
}: InputDateProps) => {
  const placeholderColor = useThemeColor({}, "textSecondary");
  const [focused, setFocused] = useState(false);

  const toggleModal = () => {
    setFocused((prev) => !prev);
  };

  const buttonColor = useThemeColor({}, "primary");
  const colors = useInputColors();

  const renderValue = useMemo(() => {
    if (!value) return "";

    let renderFormat = displayFormat;
    if (!renderFormat) {
      const formats = {
        date: "MM/dd/yyyy",
        datetime: "MM/dd/yyyy hh:mm aa",
        time: "hh:mm aa",
      };
      renderFormat = formats[type];
    }

    return format(value, renderFormat);
  }, [displayFormat, type, value]);

  const handleConfirm = (v: Date) => {
    onChange(v);
    toggleModal();
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <InputParent
      label={label}
      error={error}
      focused={focused}
      required={required}
      onPress={toggleModal}
    >
      <View
        style={[
          styles.display,
          {
            borderColor: colors.borderColor,
            backgroundColor: colors.backgroundColor,
          },
        ]}
      >
        <Pressable style={styles.valuePressable} onPress={toggleModal}>
          <Text
            style={[
              styles.value,
              { color: renderValue ? colors.color : placeholderColor },
            ]}
          >
            {renderValue || placeholder}
          </Text>
        </Pressable>
        {value && (
          <TouchableOpacity onPress={handleClear} style={styles.clear}>
            <FontAwesome size={18} color={colors.color} name="times" />
          </TouchableOpacity>
        )}
      </View>
      <DateTimePicker
        isVisible={focused}
        mode={type}
        minimumDate={min}
        maximumDate={max}
        onConfirm={handleConfirm}
        onCancel={toggleModal}
        buttonTextColorIOS={buttonColor}
      />
    </InputParent>
  );
};

const styles = StyleSheet.create({
  display: {
    ...inputStyles.input,
    flexDirection: "row",
    alignItems: "center",
  },
  valuePressable: {
    flex: 1,
  },
  value: {
    fontSize: inputStyles.input.fontSize,
  },
  clear: {
    flexShrink: 1,
    padding: 6,
  },
});
