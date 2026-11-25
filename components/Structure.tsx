import { FC } from "react";
import { ScrollView, StyleSheet, View, ViewProps } from "react-native";

type RowProps = ViewProps & { gutter?: number };
export const Row: FC<RowProps> = ({ style, gutter = 1, ...props }) => {
  const gap = gutter * 5;
  return <View style={[styles.row, { gap }, style]} {...props} />;
};

type ColProps = ViewProps & { size?: number };
export const Col: FC<ColProps> = ({ style, size = 1, ...props }) => {
  return <View style={[styles.col, { flexGrow: size }, style]} {...props} />;
};

export const FormContainer = ({ style, ...rest }: ViewProps) => {
  return (
    <ScrollView
      contentContainerStyle={[styles.form, style]}
      // Dragging the form closes the keyboard; taps on buttons still register.
      keyboardDismissMode="on-drag"
      // Make room for the keyboard and keep the field being typed in visible.
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  col: { flex: 1 },
  form: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    rowGap: 12,
    minHeight: "100%",
  },
});
