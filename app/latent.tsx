import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PasscodePrompt } from "@/components/passcode/PasscodeViews";
import { useSlapshotContext } from "@/components/Slapshot/SlapshotContext";
import { Spinner } from "@/components/Spinner";
import { SafeAreaView, Text, useThemeColor } from "@/components/themed";
import {
  addLatentPrints,
  LatentPrint,
  removeLatentPrint,
  useLatentPrints,
} from "@/features/latent/latentStore";
import { saveLatentImages } from "@/features/latent/saveLatentImages";
import {
  CaptureError,
  EncodingType,
  SlapshotCaptureError,
} from "@/modules/slapshot-capture-library/src";
import { tHelper } from "@/translations/translationHelper";
import { logEvent } from "@/util/fieldLog";
import { useRouter } from "expo-router";
import { useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Pending = { print: LatentPrint; number: number }[];

/**
 * Latent prints, like the Android app's latent_prompt.xml. With no prints yet
 * there is only Add Latent, in the middle of the screen. Once there are some:
 * a card per print (tap the print to enlarge it; save icon, Create
 * Transaction), Save All at the end of the list, and Add Latent floating in
 * the bottom corner. Add Latent opens the contactless latent (Digital Lift)
 * capture. Back is the one in the header.
 */
export default function LatentScreen() {
  const viewModel = useSlapshotContext();
  const router = useRouter();
  const prints = useLatentPrints();
  const [busy, setBusy] = useState(false);
  // Images waiting on the export passcode before they are written out.
  const [pendingSave, setPendingSave] = useState<Pending | null>(null);
  const strong = useThemeColor({}, "textStrong");
  const muted = useThemeColor({}, "textSecondary");
  const frame = useThemeColor({}, "surfaceAlt");
  const stroke = useThemeColor({}, "strokeStrong");
  const background = useThemeColor({}, "background");
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  // The print opened full screen, if any.
  const [viewing, setViewing] = useState<{
    print: LatentPrint;
    title: string;
  } | null>(null);

  if (!viewModel) return <Spinner />;

  const addLatent = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const captured = await viewModel.captureLatent();
      if (SlapshotCaptureError.isError(captured)) {
        viewModel.failCaptureBiometrics();
        if (captured.captureError !== CaptureError.Cancelled) {
          Alert.alert(tHelper("latentCaptureError"), captured.error);
        }
        return;
      }
      try {
        const payload = await viewModel.exportIdentity(
          captured,
          EncodingType.Png,
        );
        if (SlapshotCaptureError.isError(payload)) {
          Alert.alert(tHelper("latentCaptureError"), payload.error);
          return;
        }
        const lifts = payload.digitalLifts.filter(
          (lift) => lift.image?.imageBytesBase64,
        );
        if (!lifts.length) {
          Alert.alert(tHelper("latentCaptureError"), tHelper("latentNoPrint"));
          return;
        }
        addLatentPrints(
          lifts.map((lift, i) => ({
            id: Date.now() + i,
            dpi: lift.dpi,
            width: lift.image!.width,
            height: lift.image!.height,
            pngBase64: lift.image!.imageBytesBase64,
          })),
        );
        logEvent("latent", `captured ${lifts.length} print(s)`);
      } finally {
        viewModel.completeExportIdentity();
      }
    } catch (e) {
      console.error("Latent capture failed", e);
      viewModel.failCaptureBiometrics();
      Alert.alert(tHelper("latentCaptureError"), String(e));
    } finally {
      setBusy(false);
    }
  };

  const runSave = async () => {
    const items = pendingSave;
    setPendingSave(null);
    if (!items?.length) return;
    setBusy(true);
    try {
      const names = await saveLatentImages(items);
      Alert.alert(
        tHelper("latentSavedTitle"),
        tHelper("latentSavedBody").replace("{names}", names.join(", ")),
      );
    } catch (e) {
      console.error("Latent image save failed", e);
      Alert.alert(tHelper("latentCaptureError"), tHelper("latentSaveError"));
    } finally {
      setBusy(false);
    }
  };

  // The enlarged print, as big as fits the screen at the print's own shape,
  // so there is no empty panel around it and it sits in the middle.
  const viewerSize = (print: LatentPrint) => {
    const maxWidth = window.width - 24;
    const maxHeight = window.height - insets.top - insets.bottom - 150;
    const scale = Math.min(
      maxWidth / Math.max(print.width, 1),
      maxHeight / Math.max(print.height, 1),
    );
    return { width: print.width * scale, height: print.height * scale };
  };

  const title = (index: number) =>
    tHelper("latentPrintTitle").replace("{n}", String(index + 1));

  const addButton = (
    <Button
      text={tHelper("latentAddButton")}
      icon="plus"
      iconSize={28}
      style={styles.addButton}
      disabled={busy}
      onPress={addLatent}
    />
  );

  return (
    <SafeAreaView edges={["bottom"]} style={StyleSheet.absoluteFill}>
      {prints.length === 0 ? (
        // No latents yet: Add Latent sits in the middle of the screen.
        <View style={styles.empty}>{addButton}</View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.list}>
            {prints.map((print, index) => (
              <Card key={print.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.title, { color: strong }]}>
                    {title(index)}
                  </Text>
                  {print.dpi > 0 && (
                    <Text style={[styles.dpi, { color: muted }]}>
                      {tHelper("latentDpi").replace("{n}", String(print.dpi))}
                    </Text>
                  )}
                </View>
                <Pressable
                  style={[styles.imageFrame, { backgroundColor: frame }]}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={tHelper("latentTapEnlarge")}
                  onPress={() => setViewing({ print, title: title(index) })}
                >
                  <Image
                    source={{ uri: `data:image/png;base64,${print.pngBase64}` }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                </Pressable>
                <Text style={[styles.hint, { color: muted }]}>
                  {tHelper("latentTapEnlarge")}
                </Text>
                <View style={styles.row}>
                  <Pressable
                    style={[styles.iconButton, { borderColor: stroke }]}
                    accessibilityRole="button"
                    accessibilityLabel={tHelper("saveImage")}
                    disabled={busy}
                    onPress={() =>
                      setPendingSave([{ print, number: index + 1 }])
                    }
                  >
                    <MaterialCommunityIcons
                      name="content-save-outline"
                      size={26}
                      color={strong}
                    />
                  </Pressable>
                  <Pressable
                    style={[styles.iconButton, { borderColor: stroke }]}
                    accessibilityRole="button"
                    accessibilityLabel={tHelper("latentRemove")}
                    disabled={busy}
                    onPress={() => removeLatentPrint(print.id)}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={26}
                      color={strong}
                    />
                  </Pressable>
                  <Button
                    text={tHelper("createTransaction")}
                    style={styles.create}
                    disabled={busy}
                    onPress={() =>
                      router.push({
                        pathname: "/latentTransaction",
                        params: { id: String(print.id) },
                      })
                    }
                  />
                </View>
              </Card>
            ))}
            <Button
              text={tHelper("saveAll")}
              disabled={busy}
              onPress={() =>
                setPendingSave(
                  prints.map((print, index) => ({ print, number: index + 1 })),
                )
              }
            />
          </ScrollView>
          {/* Floats over the end of the list, which scrolls clear of it. */}
          <View style={styles.fab} pointerEvents="box-none">
            {addButton}
          </View>
        </>
      )}
      <PasscodePrompt
        visible={pendingSave !== null}
        onCancel={() => setPendingSave(null)}
        onUnlocked={runSave}
      />
      {/* A print full screen: pinch to zoom, drag to move. The screen keeps
          the app's theme; only the print itself sits on white. */}
      <Modal
        visible={!!viewing}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setViewing(null)}
      >
        <View
          style={[
            styles.viewer,
            {
              backgroundColor: background,
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <Text style={[styles.viewerTitle, { color: strong }]}>
            {viewing?.title ?? ""}
          </Text>
          <ScrollView
            style={styles.viewerScroll}
            contentContainerStyle={styles.viewerContent}
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
            maximumZoomScale={8}
            minimumZoomScale={1}
            bouncesZoom
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            {viewing && (
              <Image
                source={{
                  uri: `data:image/png;base64,${viewing.print.pngBase64}`,
                }}
                style={[styles.viewerImage, viewerSize(viewing.print)]}
                resizeMode="contain"
              />
            )}
          </ScrollView>
          <Button
            text={tHelper("done")}
            style={styles.viewerDone}
            onPress={() => setViewing(null)}
          />
        </View>
      </Modal>
      {busy && <Spinner />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 12, paddingBottom: 110, gap: 14 },
  card: { gap: 10 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  title: { fontSize: 18, fontWeight: "700" },
  dpi: { fontSize: 14 },
  imageFrame: { height: 300, borderRadius: 10, padding: 8 },
  image: { width: "100%", height: "100%" },
  hint: { fontSize: 13, textAlign: "center" },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  create: { flex: 1, width: "auto", paddingHorizontal: 6 },
  addButton: { width: "auto", paddingHorizontal: 22 },
  fab: { position: "absolute", right: 16, bottom: 28 },
  viewer: { flex: 1, paddingHorizontal: 12 },
  viewerImage: { backgroundColor: "#FFFFFF", borderRadius: 8 },
  viewerTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  viewerScroll: { flex: 1 },
  viewerContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  viewerDone: { marginTop: 8 },
});
