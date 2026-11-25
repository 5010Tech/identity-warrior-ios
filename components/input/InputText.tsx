import { useRef, useState } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { InputParent } from "./InputParent";
import { inputStyles, useInputColors } from "./styles";

interface InputTextProps extends TextInputProps {
  onChange: (...e: any[]) => void;
  required?: boolean;
  error?: string;
  label?: string;
  type?: "number";
  fieldName?: string;
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
  // Passed by ControlledInput; not a TextInput prop, so keep it out of ...props.
  fieldName: _fieldName,
  ...props
}: InputTextProps) => {
  const [focused, setFocus] = useState(false);
  const colors = useInputColors();

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
        style={[
          styles.input,
          {
            borderColor: colors.borderColor,
            backgroundColor: colors.backgroundColor,
            color: colors.color,
          },
          style,
        ]}
        placeholderTextColor={colors.placeholder}
        onChangeText={handleChangeText}
        // Every field gets the keyboard's Done key (the blue check on iOS), which
        // closes the keyboard. Current iOS shows it on the number pad as well.
        keyboardType={type === "number" ? "number-pad" : "default"}
        returnKeyType="done"
        // In multi-line fields the key finishes entry instead of adding a line.
        submitBehavior="blurAndSubmit"
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
