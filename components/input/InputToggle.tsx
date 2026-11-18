import { Switch } from "react-native";
import { InputParent } from "./InputParent";
import { useThemeColor } from "../themed";

interface InputToggleProps {
  onChange: (...e: any[]) => void;
  required?: boolean;
  error?: string;
  label?: string;
  value?: boolean;
}

export const InputToggle = ({
  onChange,
  required,
  error,
  label,
  value,
}: InputToggleProps) => {
  const primary = useThemeColor({}, "primary");
  return (
    <InputParent
      required={required}
      error={error}
      label={label}
      onPress={onChange}
    >
      <Switch
        trackColor={{ true: primary }}
        value={value}
        onValueChange={onChange}
      />
    </InputParent>
  );
};
