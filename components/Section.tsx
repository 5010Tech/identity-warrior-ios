import { Card } from "@/components/Card";
import { Text, useThemeColor } from "@/components/themed";
import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

/** Uppercase, letter-spaced section label (Android settings screens). */
export function SectionHeader({ title }: { title: string }) {
  const color = useThemeColor({}, "textStrong");
  return <Text style={[styles.header, { color }]}>{title}</Text>;
}

/** A labelled card: section header above a card that holds a group of fields. */
export function Section({
  title,
  children,
  style,
}: PropsWithChildren<{ title?: string; style?: ViewStyle }>) {
  return (
    <View style={styles.section}>
      {title ? <SectionHeader title={title} /> : null}
      <Card style={[styles.card, style]}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  header: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 10,
    marginLeft: 4,
  },
  card: { gap: 14 },
});
