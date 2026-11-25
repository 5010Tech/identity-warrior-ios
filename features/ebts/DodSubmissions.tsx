import { Button } from "@/components/Button";
import { IwDrawerContent } from "@/components/navigation/IwDrawerContent";
import { PasscodePrompt } from "@/components/passcode/PasscodeViews";
import PlaceholderLogo from "@/components/PlaceholderLogo";
import { Spinner } from "@/components/Spinner";
import { Text, useThemeColor } from "@/components/themed";
import { tHelper } from "@/translations/translationHelper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  deleteSubmission,
  DodSubmission,
  exportSubmissions,
  listSubmissions,
  applyRetention,
  retentionDays,
} from "./vault";
import {
  deliveryOf,
  refreshSubmission,
  sendSubmission,
  watchSubmissions,
} from "./sendSubmission";
import { SubmissionDetails } from "./SubmissionDetails";
import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";

const DRAWER_WIDTH = 290;

/** The slide-out menu, sliding in from the left like Android's drawer. */
const SideMenu = ({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const slide = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  useEffect(() => {
    if (visible) {
      slide.setValue(-DRAWER_WIDTH);
      Animated.timing(slide, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [slide, visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.menuRoot}>
        <Animated.View
          style={[styles.menuPanel, { transform: [{ translateX: slide }] }]}
        >
          {children}
        </Animated.View>
        <Pressable
          style={styles.menuScrim}
          onPress={onClose}
          accessibilityLabel={tHelper("cancel")}
        />
      </View>
    </Modal>
  );
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
};

/**
 * DoD Submissions: the transactions stored (encrypted) on this phone, as
 * cards like the Android app's, with the slide-out menu's Export All and
 * Select Exports. Exporting asks for the export passcode first.
 */
export function DodSubmissions() {
  const background = useThemeColor({}, "background");
  const surface = useThemeColor({}, "surface");
  const surfaceAlt = useThemeColor({}, "surfaceAlt");
  const stroke = useThemeColor({}, "stroke");
  const strong = useThemeColor({}, "textStrong");
  const muted = useThemeColor({}, "textSecondary");
  const icon = useThemeColor({}, "icon");
  const accent = useThemeColor({}, "accent");
  const danger = useThemeColor({}, "danger");
  const success = useThemeColor({}, "success");

  const [submissions, setSubmissions] = useState<DodSubmission[]>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  // The TCNs waiting on the passcode; null when no export is in progress.
  const [pendingExport, setPendingExport] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  // The card whose details are open, by TCN, so it follows status changes.
  const [openTcn, setOpenTcn] = useState<string | null>(null);

  const appSettings = useAutofillSelector((s) => s.appSettings);
  const { submissionDays, exportDays } = retentionDays(appSettings);
  const load = useCallback(() => {
    // Retention first, so anything past its days is gone before the list shows.
    applyRetention()
      .then(listSubmissions)
      .then(setSubmissions)
      .catch((error) => {
        console.error("Could not load stored transactions", error);
        setSubmissions([]);
      });
  }, [submissionDays, exportDays]);
  useFocusEffect(load);
  // Reload when a background send finishes, and ask BioCore about anything
  // sent but not yet finished each time the list is shown.
  useEffect(() => watchSubmissions(load), [load]);
  useFocusEffect(
    useCallback(() => {
      listSubmissions()
        .then((items) => Promise.all(items.map(refreshSubmission)))
        .then(load)
        .catch(() => undefined);
    }, [load]),
  );

  const stopSelecting = () => {
    setSelecting(false);
    setSelected([]);
  };

  const toggle = (tcn: string) =>
    setSelected((current) =>
      current.includes(tcn)
        ? current.filter((item) => item !== tcn)
        : [...current, tcn],
    );

  const startExport = (tcns: string[]) => {
    if (!tcns.length) {
      Alert.alert(tHelper("export"), tHelper("noFilesExport"));
      return;
    }
    setPendingExport(tcns);
  };

  const runExport = async () => {
    const tcns = pendingExport ?? [];
    setPendingExport(null);
    setBusy(true);
    try {
      const files = await exportSubmissions(tcns);
      stopSelecting();
      Alert.alert(
        tHelper("exportDone"),
        `${files.length} ${tHelper("exportDoneMessage")}`,
      );
    } catch (error) {
      console.error("Export failed", error);
      Alert.alert(tHelper("exportFailed"), String(error));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = ({ tcn, name }: DodSubmission) =>
    Alert.alert(tHelper("delete"), `${tHelper("deleteSubmissionAsk")}\n\n${name}\n${tcn}`, [
      { text: tHelper("cancel"), style: "cancel" },
      {
        text: tHelper("delete"),
        style: "destructive",
        onPress: () => deleteSubmission(tcn).then(load).catch(console.error),
      },
    ]);

  const all = submissions ?? [];

  return (
    <View style={[styles.screen, { backgroundColor: background }]}>
      <View style={styles.header}>
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={tHelper("menu")}
          onPress={() => setMenuOpen(true)}
        >
          <MaterialCommunityIcons name="menu" size={30} color={icon} />
        </Pressable>
        <Text style={[styles.heading, { color: strong }]}>
          {tHelper("submissions")}
        </Text>
      </View>

      {!submissions ? (
        <Spinner />
      ) : !all.length ? (
        <PlaceholderLogo text={tHelper("noSubmissions")} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {all.map((submission) => {
            const isSelected = selected.includes(submission.tcn);
            const delivery = deliveryOf(submission);
            return (
              <Pressable
                key={submission.tcn}
                onPress={() =>
                  selecting
                    ? toggle(submission.tcn)
                    : setOpenTcn(submission.tcn)
                }
                style={[
                  styles.card,
                  {
                    backgroundColor: surface,
                    borderColor: isSelected ? accent : stroke,
                  },
                ]}
              >
                <View style={styles.cardRow}>
                <View style={[styles.photo, { backgroundColor: surfaceAlt }]}>
                  {submission.thumbnail ? (
                    <Image
                      style={styles.photoImage}
                      source={{
                        uri: `data:image/jpeg;base64,${submission.thumbnail}`,
                      }}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="account"
                      size={68}
                      color={muted}
                    />
                  )}
                </View>
                <View style={styles.details}>
                  <Text
                    numberOfLines={1}
                    style={[styles.name, { color: strong }]}
                  >
                    {submission.name}
                  </Text>
                  <Text numberOfLines={1} style={[styles.small, { color: muted }]}>
                    {submission.tot}
                  </Text>
                  <Text numberOfLines={1} style={[styles.small, { color: muted }]}>
                    {formatDate(submission.createdAt)}
                  </Text>
                  {!!delivery && (
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.status,
                        {
                          color:
                            delivery.tone === "bad"
                              ? danger
                              : delivery.tone === "pending"
                                ? muted
                                : success,
                        },
                      ]}
                    >
                      {tHelper(delivery.label)}
                      {delivery.error ? `: ${delivery.error}` : ""}
                    </Text>
                  )}
                </View>
                {selecting ? (
                  <MaterialCommunityIcons
                    name={
                      isSelected
                        ? "checkbox-marked-circle"
                        : "checkbox-blank-circle-outline"
                    }
                    size={30}
                    color={isSelected ? accent : muted}
                  />
                ) : (
                  <View style={styles.cardActions}>
                  {!delivery?.delivered && (
                      <Pressable
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={tHelper("resubmit")}
                        onPress={() => void sendSubmission(submission)}
                      >
                        <MaterialCommunityIcons
                          name="send"
                          size={26}
                          color={icon}
                        />
                      </Pressable>
                    )}
                  <Pressable
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={tHelper("delete")}
                    onPress={() => confirmDelete(submission)}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={26}
                      color={danger}
                    />
                  </Pressable>
                  </View>
                )}
                </View>
                {/* The TCN across the full width of the card, on one line. */}
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={[styles.tcn, { color: muted, borderTopColor: stroke }]}
                >
                  {submission.tcn}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {selecting && (
        <View style={styles.selectBar}>
          <Button
            variant="secondary"
            text={tHelper("cancel")}
            style={styles.grow}
            onPress={stopSelecting}
          />
          <Button
            text={`${tHelper("exportSelected")} (${selected.length})`}
            icon="export-variant"
            style={styles.growWide}
            onPress={() => startExport(selected)}
          />
        </View>
      )}

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <IwDrawerContent
          title={tHelper("submissions")}
          sections={[
            {
              items: [
                {
                  label: tHelper("exportAll"),
                  icon: "export-variant",
                  onPress: () => {
                    setMenuOpen(false);
                    startExport(all.map(({ tcn }) => tcn));
                  },
                },
                {
                  label: tHelper("exportSelect"),
                  icon: "checkbox-multiple-marked-outline",
                  onPress: () => {
                    setMenuOpen(false);
                    setSelected([]);
                    setSelecting(true);
                  },
                },
              ],
            },
          ]}
        />
      </SideMenu>

      <SubmissionDetails
        submission={all.find(({ tcn }) => tcn === openTcn) ?? null}
        onClose={() => setOpenTcn(null)}
        onResubmit={(submission) => void sendSubmission(submission)}
      />

      <PasscodePrompt
        visible={pendingExport !== null}
        onCancel={() => setPendingExport(null)}
        onUnlocked={runExport}
      />
      {busy && <Spinner />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heading: { fontSize: 22, fontWeight: "700" },
  list: { gap: 10, padding: 12 },
  card: {
    gap: 10,
    padding: 14,
    borderWidth: 1.5,
    borderRadius: 14,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  tcn: {
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  photo: {
    width: 104,
    height: 104,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: { width: "100%", height: "100%" },
  details: { flex: 1, gap: 5 },
  name: { fontSize: 21, fontWeight: "700" },
  small: { fontSize: 14 },
  status: { fontSize: 13, fontWeight: "600" },
  cardActions: { gap: 18, alignItems: "center" },
  selectBar: { flexDirection: "row", gap: 10, padding: 12 },
  grow: { flex: 1 },
  growWide: { flex: 2 },
  menuRoot: { flex: 1, flexDirection: "row" },
  menuPanel: { width: DRAWER_WIDTH },
  menuScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
});
