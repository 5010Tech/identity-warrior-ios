import { Button } from "@/components/Button";
import { useSlapshotContext } from "@/components/Slapshot/SlapshotContext";
import { Spinner } from "@/components/Spinner";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logEvent } from "@/util/fieldLog";
import { SafeAreaView, Text, useThemeColor } from "@/components/themed";
import {
  useCaptureActions,
  useCaptureValue,
} from "@/features/capture/context/hooks";
import { PalmPrint } from "@/features/capture/types";
import {
  CaptureError,
  EncodingType,
  FingerType,
  SlapshotCaptureError,
} from "@/modules/slapshot-capture-library/src";
import { tHelper, translationKey } from "@/translations/translationHelper";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { Hand } from "@/features/capture/fingerButtons";
import {
  FingerButtonCard,
  HandTabs,
  PrintViewer,
} from "@/features/capture/FingerHandViews";

/** The contactless palm positions for each hand: full palm, then writer's palm. */
const POSITIONS: Record<Hand, { type: FingerType; label: translationKey }[]> = {
  left: [
    { type: FingerType.LFP, label: "leftFullPalm" },
    { type: FingerType.LWP, label: "leftWritersPalm" },
  ],
  right: [
    { type: FingerType.RFP, label: "rightFullPalm" },
    { type: FingerType.RWP, label: "rightWritersPalm" },
  ],
};

/**
 * Contactless palm capture (DoD, when Allow Contactless Palm Collection is on):
 * Left Hand / Right Hand tabs like the fingerprint screen (swipe or tap). Each
 * hand lists its palm positions; a captured one shows its print instead, and
 * tapping the print captures it again.
 */
export default function PalmScreen() {
  const router = useRouter();
  const viewModel = useSlapshotContext();
  const palms = useCaptureValue<PalmPrint[]>("palms") ?? [];
  const { setValue } = useCaptureActions();
  const [busy, setBusy] = useState(false);
  // The starting hand (App Settings) is the tab shown first.
  const startLeft = useAutofillSelector(
    (s) => s.appSettings?.startingHand === "Left",
  );
  const [hand, setHand] = useState<Hand>(startLeft ? "left" : "right");
  // The saved palm opened full screen from the hand view, if any.
  const [viewing, setViewing] = useState<{
    type: FingerType;
    label: translationKey;
    print: PalmPrint;
  } | null>(null);
  // The print under review, opened full screen by tapping it.
  const [zoomed, setZoomed] = useState(false);
  // The space the full-screen print has to fill, measured when it opens.
  const [zoomBox, setZoomBox] = useState({ width: 0, height: 0 });
  // The capture waiting for Save Image or Recapture.
  const [review, setReview] = useState<{
    print: PalmPrint;
    label: translationKey;
    done: (keep: boolean) => void;
  } | null>(null);
  const insets = useSafeAreaInsets();
  const cover = useThemeColor({}, "background");
  const wheel = useThemeColor({}, "progress");
  const pager = useRef<ScrollView>(null);
  const pagerSettled = useRef(false);
  const [pageWidth, setPageWidth] = useState(0);
  const surface = useThemeColor({}, "surface");
  const stroke = useThemeColor({}, "stroke");
  const strong = useThemeColor({}, "textStrong");

  if (!viewModel) return <Spinner />;

  /** One capture: the print for the screen (PNG) and for the file (WSQ). */
  const captureOnce = async (type: FingerType): Promise<PalmPrint | null> => {
    const captured = await viewModel.capturePalm(type);
    if (SlapshotCaptureError.isError(captured)) {
      viewModel.failCaptureBiometrics();
      if (captured.captureError !== CaptureError.Cancelled) {
        Alert.alert(tHelper("palmCaptureError"), captured.error);
      }
      return null;
    }
    try {
      const payload = await viewModel.exportIdentity(captured, EncodingType.Png);
      if (SlapshotCaptureError.isError(payload)) {
        Alert.alert(tHelper("palmCaptureError"), payload.error);
        return null;
      }
      const palm = payload.palms.find((p) => p.image?.imageBytesBase64);
      if (!palm?.image) {
        Alert.alert(tHelper("palmCaptureError"), tHelper("palmNoImage"));
        return null;
      }
      // The same capture again as WSQ, which is what goes in the EBTS file
      // (as on Android). The PNG above is for showing on screen.
      let wsq: string | undefined;
      try {
        const wsqPayload = await viewModel.exportIdentity(captured);
        if (!SlapshotCaptureError.isError(wsqPayload)) {
          wsq = wsqPayload.palms.find((p) => p.image?.imageBytesBase64)?.image
            ?.imageBytesBase64;
        }
      } catch (e) {
        console.warn("Palm WSQ export failed; keeping the PNG", e);
      }
      return {
        position: type,
        wsq,
        image: palm.image.imageBytesBase64,
        width: palm.image.width,
        height: palm.image.height,
        dpi: palm.dpi,
      };
    } finally {
      viewModel.completeExportIdentity();
    }
  };

  /**
   * Capture, then review: Save Image keeps the print, Recapture takes it
   * again. The hand layout stays hidden behind the progress wheel throughout.
   */
  const capture = async (type: FingerType, label: translationKey) => {
    if (busy) return;
    setBusy(true);
    try {
      for (;;) {
        const print = await captureOnce(type);
        if (!print) return;
        const keep = await new Promise<boolean>((done) =>
          setReview({ print, label, done }),
        );
        setReview(null);
        if (keep) {
          setValue("palms", [
            ...palms.filter((p) => p.position !== type),
            print,
          ]);
          logEvent("palm", `saved ${type}, wsq ${print.wsq ? "yes" : "no"}`);
          return;
        }
      }
    } catch (e) {
      console.error("Palm capture failed", e);
      viewModel.failCaptureBiometrics();
      Alert.alert(tHelper("palmCaptureError"), String(e));
    } finally {
      setBusy(false);
    }
  };

  const showHand = (side: Hand) => {
    setHand(side);
    pager.current?.scrollTo({ x: side === "left" ? 0 : pageWidth });
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <HandTabs hand={hand} onChange={showHand} />
      <View
        style={styles.pager}
        onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}
      >
        {pageWidth > 0 && (
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: hand === "left" ? 0 : pageWidth, y: 0 }}
            // Set the starting hand again once the pages have their width.
            onContentSizeChange={() => {
              if (pagerSettled.current) return;
              pagerSettled.current = true;
              pager.current?.scrollTo({
                x: hand === "left" ? 0 : pageWidth,
                animated: false,
              });
            }}
            onMomentumScrollEnd={(e) =>
              setHand(
                e.nativeEvent.contentOffset.x < pageWidth / 2
                  ? "left"
                  : "right",
              )
            }
          >
            {(["left", "right"] as Hand[]).map((side) => (
              <ScrollView
                key={side}
                style={{ width: pageWidth }}
                contentContainerStyle={styles.hand}
                showsVerticalScrollIndicator={false}
              >
                {POSITIONS[side].map(({ type, label }) => {
                  const print = palms.find((p) => p.position === type);
                  if (!print) {
                    return (
                      <FingerButtonCard
                        key={type}
                        label={label}
                        icon="hand-back-left-outline"
                        mirrored={side === "right"}
                        disabled={busy}
                        onPress={() => capture(type, label)}
                      />
                    );
                  }
                  return (
                    <Pressable
                      key={type}
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => setViewing({ type, label, print })}
                      style={({ pressed }) => [
                        styles.tile,
                        { backgroundColor: surface, borderColor: stroke },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.label, { color: strong }]}>
                        {tHelper(label)}
                      </Text>
                      <Image
                        source={{ uri: `data:image/png;base64,${print.image}` }}
                        style={styles.image}
                        resizeMode="contain"
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            ))}
          </ScrollView>
        )}
      </View>
      <Button text={tHelper("done")} onPress={router.back} />
      <PrintViewer
        print={
          viewing ? { title: viewing.label, png: viewing.print.image } : null
        }
        onClose={() => setViewing(null)}
        onRecapture={() => {
          const palm = viewing;
          setViewing(null);
          if (palm) void capture(palm.type, palm.label);
        }}
      />
      {/* While a capture is running or being reviewed, only the wheel shows. */}
      {busy && (
        <View style={[styles.cover, { backgroundColor: cover }]}>
          <ActivityIndicator size="large" color={wheel} />
        </View>
      )}
      <Modal
        visible={!!review}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View
          style={[
            styles.review,
            {
              backgroundColor: cover,
              paddingTop: insets.top + 15,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <Button
            icon="camera-retake-outline"
            text={tHelper("recapture")}
            style={styles.reviewButton}
            onPress={() => review?.done(false)}
          />
          <View style={styles.reviewBody}>
            <Text style={[styles.reviewLabel, { color: strong }]}>
              {review ? tHelper(review.label) : ""}
            </Text>
            {/* White only behind the print. Pinch to zoom. */}
            <ScrollView
              style={styles.reviewPrint}
              contentContainerStyle={styles.reviewPrintContent}
              maximumZoomScale={8}
              minimumZoomScale={1}
              bouncesZoom
              centerContent
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              {!!review && (
                // Tap for the print on its own, filling the screen.
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tHelper("palmViewFullScreen")}
                  onPress={() => setZoomed(true)}
                >
                  <Image
                    key={review.print.image.length}
                    resizeMode="contain"
                    style={styles.reviewImage}
                    source={{
                      uri: `data:image/png;base64,${review.print.image}`,
                    }}
                  />
                </Pressable>
              )}
            </ScrollView>
          </View>
          <Button
            icon="content-save-outline"
            text={tHelper("saveImage")}
            style={styles.reviewButton}
            onPress={() => review?.done(true)}
          />
        </View>
        {/* The print alone, full screen: pinch to zoom, Done to go back. */}
        <Modal
          visible={zoomed && !!review}
          animationType="fade"
          presentationStyle="fullScreen"
          onRequestClose={() => setZoomed(false)}
        >
          <View
            style={[
              styles.zoom,
              {
                backgroundColor: cover,
                paddingTop: insets.top + 8,
                paddingBottom: insets.bottom + 8,
              },
            ]}
          >
            <Text style={[styles.reviewLabel, { color: strong }]}>
              {review ? tHelper(review.label) : ""}
            </Text>
            {/* The print is sized to the space it is given, so whatever
                shape it is, it sits whole in the middle of the screen. */}
            <View
              style={styles.zoomBody}
              onLayout={(e) =>
                setZoomBox({
                  width: e.nativeEvent.layout.width,
                  height: e.nativeEvent.layout.height,
                })
              }
            >
              {!!review && zoomBox.width > 0 && (
                <ScrollView
                  style={{ width: zoomBox.width, height: zoomBox.height }}
                  contentContainerStyle={[
                    styles.zoomPrint,
                    { width: zoomBox.width, height: zoomBox.height },
                  ]}
                  maximumZoomScale={8}
                  minimumZoomScale={1}
                  bouncesZoom
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                >
                  <Pressable
                    style={styles.zoomFill}
                    onPress={() => setZoomed(false)}
                  >
                    <Image
                      resizeMode="contain"
                      style={styles.zoomFill}
                      source={{
                        uri: `data:image/png;base64,${review.print.image}`,
                      }}
                    />
                  </Pressable>
                </ScrollView>
              )}
            </View>
            <Button
              text={tHelper("done")}
              style={styles.reviewButton}
              onPress={() => setZoomed(false)}
            />
          </View>
        </Modal>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 10, gap: 10 },
  pager: { flex: 1 },
  cover: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  review: { flex: 1, paddingHorizontal: 12, gap: 12 },
  reviewButton: { alignSelf: "center", minWidth: 240 },
  reviewBody: { flex: 1, justifyContent: "center", gap: 8 },
  reviewLabel: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  reviewPrint: { flexGrow: 0, backgroundColor: "#FFFFFF", borderRadius: 8 },
  zoom: { flex: 1, paddingHorizontal: 12, gap: 12 },
  zoomBody: { flex: 1, alignSelf: "stretch" },
  zoomPrint: { backgroundColor: "#FFFFFF", borderRadius: 8 },
  zoomFill: { width: "100%", height: "100%" },
  reviewPrintContent: { padding: 6 },
  reviewImage: { width: "100%", height: 420 },
  hand: { gap: 10, paddingBottom: 6 },
  tile: {
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  pressed: { opacity: 0.6 },
  image: { width: "100%", height: 190 },
  label: { fontSize: 16, fontWeight: "600" },
});
