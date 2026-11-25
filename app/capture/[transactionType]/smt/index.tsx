import { Button } from "@/components/Button";
import { SafeAreaView, Text, useThemeColor } from "@/components/themed";
import { useState } from "react";
import { smtCodeLabel, smtTypeFor } from "@/constants/smt";
import {
  useCaptureActions,
  useCaptureValue,
} from "@/features/capture/context/hooks";
import { SmtEntry } from "@/features/capture/types";
import { setPendingSmtPhoto, takeSmtPhoto } from "@/features/capture/smtPhoto";
import { tHelper } from "@/translations/translationHelper";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

/**
 * Scars, marks and tattoos recorded for this collection, like the Android
 * app's smt_summary.xml: a card per record and a floating Add SMT button.
 */
export default function SmtScreen() {
  const router = useRouter();
  const { transactionType } = useLocalSearchParams<{
    transactionType: string;
  }>();
  const smts = useCaptureValue<SmtEntry[]>("smts") ?? [];
  const { setValue } = useCaptureActions();
  const strong = useThemeColor({}, "textStrong");
  const muted = useThemeColor({}, "textSecondary");
  const background = useThemeColor({}, "background");
  const surface = useThemeColor({}, "surface");
  const divider = useThemeColor({}, "divider");
  const danger = useThemeColor({}, "danger");
  const button = useThemeColor({}, "button");
  const buttonText = useThemeColor({}, "buttonText");

  const openEdit = (id?: string) =>
    router.push({
      pathname: "/capture/[transactionType]/smt/edit",
      params: id ? { transactionType, id } : { transactionType },
    });

  // Like Android: Add SMT goes straight to the camera, then to the details.
  // A progress wheel covers this list from the moment the camera opens until
  // the details screen has taken over, so the list doesn't flash in between.
  const [opening, setOpening] = useState(false);
  const addSmt = async () => {
    setOpening(true);
    const photo = await takeSmtPhoto();
    if (!photo) {
      setOpening(false);
      return;
    }
    setPendingSmtPhoto(photo);
    openEdit();
    setTimeout(() => setOpening(false), 700);
  };

  const remove = (id: string) =>
    Alert.alert(tHelper("deleteSmtTitle"), tHelper("deleteSmt"), [
      { text: tHelper("cancel"), style: "cancel" },
      {
        text: tHelper("delete"),
        style: "destructive",
        onPress: () =>
          setValue(
            "smts",
            smts.filter((smt) => smt.id !== id),
          ),
      },
    ]);

  return (
    <SafeAreaView edges={["bottom"]} style={StyleSheet.absoluteFill}>
      {smts.length === 0 ? (
        // Nothing recorded yet: the Add SMT button sits in the middle of the screen.
        <View style={styles.emptyState}>
          <Text style={[styles.empty, { color: muted }]}>
            {tHelper("smtEmpty")}
          </Text>
          <Button
            text={tHelper("smtAddButton")}
            icon="plus"
            style={styles.fabButton}
            onPress={addSmt}
          />
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.list}>
        {smts.map((smt, index) => {
          const type = smtTypeFor(smt.category);
          return (
            // Android item_smt_card.xml: outline, left stripe and type label in
            // the type's color; numbered thumbnail; Delete (text) and Edit (pill).
            <View
              key={smt.id}
              style={[
                styles.card,
                { backgroundColor: surface, borderColor: type.color },
              ]}
            >
              <View style={[styles.accent, { backgroundColor: type.color }]} />
              <View style={styles.cardBody}>
                <View style={styles.row}>
                  <View style={[styles.thumb, { backgroundColor: divider }]}>
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${smt.photo}` }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                    <View style={styles.number}>
                      <Text style={styles.numberText}>#{index + 1}</Text>
                    </View>
                  </View>
                  <View style={styles.details}>
                    <View style={[styles.type, { backgroundColor: type.color }]}>
                      <Text style={styles.typeText}>{type.label}</Text>
                    </View>
                    <Text
                      style={[styles.title, { color: strong }]}
                      numberOfLines={3}
                    >
                      {smtCodeLabel(smt.category, smt.code)}
                    </Text>
                    <Text
                      style={[styles.code, { color: muted }]}
                      numberOfLines={1}
                    >
                      {smt.code}
                    </Text>
                    {smt.description ? (
                      <Text
                        style={[styles.note, { color: muted }]}
                        numberOfLines={2}
                      >
                        {"\u201C"}
                        {smt.description}
                        {"\u201D"}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: divider }]} />
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => remove(smt.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    style={styles.delete}
                  >
                    <Text style={[styles.deleteText, { color: danger }]}>
                      {tHelper("delete")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openEdit(smt.id)}
                    accessibilityRole="button"
                    style={[styles.edit, { backgroundColor: button }]}
                  >
                    <Text style={[styles.editText, { color: buttonText }]}>
                      {tHelper("edit")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
      )}
      {smts.length > 0 && (
        <View style={styles.fab} pointerEvents="box-none">
          <Button
            text={tHelper("smtAddButton")}
            icon="plus"
            style={styles.fabButton}
            onPress={addSmt}
          />
        </View>
      )}
      {opening && (
        // Solid cover, so nothing of the list shows behind the wheel.
        <View style={[styles.cover, { backgroundColor: background }]}>
          <ActivityIndicator size="large" color={strong} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 110, gap: 14 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: 24,
  },
  empty: { fontSize: 18, textAlign: "center" },
  card: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderRadius: 16,
    overflow: "hidden",
  },
  accent: { width: 6 },
  cardBody: { flex: 1, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6 },
  row: { flexDirection: "row", gap: 14 },
  thumb: { width: 104, height: 104, borderRadius: 12, overflow: "hidden" },
  number: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "#000000B3",
  },
  numberText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  details: { flex: 1 },
  type: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  title: { marginTop: 8, fontSize: 17, fontWeight: "700" },
  code: { marginTop: 4, fontSize: 13, fontFamily: "Menlo" },
  note: { marginTop: 6, fontSize: 14, fontStyle: "italic" },
  divider: { height: 1, marginTop: 12 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  delete: { paddingHorizontal: 8, paddingVertical: 10 },
  deleteText: { fontSize: 15, fontWeight: "600" },
  edit: {
    minWidth: 104,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editText: { fontSize: 15, fontWeight: "600" },
  cover: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  fab: { position: "absolute", right: 16, bottom: 28 },
  fabButton: { width: "auto", paddingHorizontal: 22 },
});
