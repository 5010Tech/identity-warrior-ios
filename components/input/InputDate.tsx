import Colors from "@/constants/style/Colors";
import { FontAwesome } from "@expo/vector-icons";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TouchableOpacity
} from "react-native";
import DateTimePicker from "react-native-modal-datetime-picker";
import { Text, useThemeColor, View } from "../themed";
import { InputParent } from "./InputParent";
import { inputStyles } from "./styles";

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
}: InputDateProps) => {
  const [focused, setFocused] = useState(false);

  const toggleModal = () => {
    setFocused((prev) => !prev);
  };

  const buttonColor = useThemeColor({}, "primary");

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
      <View style={styles.display}>
        <Pressable style={styles.valuePressable} onPress={toggleModal}>
          <Text style={styles.value}>{renderValue}</Text>
        </Pressable>
        {value && (
          <TouchableOpacity onPress={handleClear} style={styles.clear}>
            <FontAwesome size={14} color={Colors.light.text} name="times" />
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
    flexDirection: "row",
    ...inputStyles.input,
  },
  valuePressable: {
    flex: 1,
  },
  value: {
    fontSize: inputStyles.input.fontSize,
  },
  clear: {
    flexShrink: 1,
    marginRight: -15,
  },
});
