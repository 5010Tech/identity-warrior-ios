import { FC } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { View, ViewProps } from "./themed";

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
  return <ScrollView contentContainerStyle={[styles.form, style]} {...rest} />;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  col: { flex: 1 },
  form: {
    flexGrow: 1,
    paddingHorizontal: 15,
    rowGap: 20,
    minHeight: "100%",
  },
});
