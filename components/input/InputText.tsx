import { useRef, useState } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { InputParent } from "./InputParent";
import { inputStyles } from "./styles";

interface InputTextProps extends TextInputProps {
  onChange: (...e: any[]) => void;
  required?: boolean;
  error?: string;
  label?: string;
  type?: "number";
}

export const InputText = ({
  onChangeText,
  onChange,
  required,
  error,
  label,
  style,
  type,
  value,
  editable = true,
  ...props
}: InputTextProps) => {
  const [focused, setFocus] = useState(false);

  const handleChangeText = (v: string) => {
    v = type === "number" ? v.replace(/[^0-9]/g, "") : v;
    onChange(v);
  };

  const onFocus = () => setFocus(true);
  const onBlur = () => setFocus(false);
  const inputRef = useRef<TextInput>(null);

  const handleParentPress = () => {
    if (!editable) return;
    inputRef.current?.focus();
  };
  return (
    <InputParent
      label={label}
      error={error}
      required={required}
      focused={focused}
      onPress={handleParentPress}
    >
      <TextInput
        onFocus={onFocus}
        onBlur={onBlur}
        style={[styles.input, style]}
        onChangeText={handleChangeText}
        keyboardType={type === "number" ? "number-pad" : "default"}
        value={value?.toString()}
        ref={inputRef}
        editable={editable}
        {...props}
      />
    </InputParent>
  );
};

const styles = StyleSheet.create({
  input: inputStyles.input,
});
