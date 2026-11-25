import { tHelper } from "@/translations/translationHelper";
import {
  ExpoDocumentReaderDebugCapture,
  ExpoDocumentReaderScanGuidance,
  ExpoDocumentReaderScanMode,
} from "@/modules/expo-document-reader";
import BarcodeHighlight from "@/components/BarcodeHighlight";
import React from "react";
import {
  Image,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  title: string;
  subtitle: string;
  scanMode: ExpoDocumentReaderScanMode;
  guidance: ExpoDocumentReaderScanGuidance;
  detectionBox?: NormalizedRect | null;
  debugCapture?: ExpoDocumentReaderDebugCapture | null;
  onDebugCapture?: () => void;
  onCancel?: () => void;
  /** Draw a frame across the middle of the view for the zone to go in. */
  zoneFrame?: boolean;
  /**
   * Barcode mode: where the camera sees a code, as fractions of the view
   * from its top left corner. Outlined on screen, green once it is read.
   */
  codeBox?: NormalizedRect | null;
};

function guidanceLabel(
  guidance: ExpoDocumentReaderScanGuidance,
  scanMode: ExpoDocumentReaderScanMode,
) {
  switch (guidance) {
    case "moveCloser":
      return tHelper("scanGuidanceMoveCloser");
    case "moveFarther":
      return tHelper("scanGuidanceMoveFarther");
    case "moveLeft":
      return tHelper("scanGuidanceMoveLeft");
    case "moveRight":
      return tHelper("scanGuidanceMoveRight");
    case "moveUp":
      return tHelper("scanGuidanceMoveUp");
    case "moveDown":
      return tHelper("scanGuidanceMoveDown");
    case "alignBottom":
      return tHelper("scanGuidanceAlignBottom");
    case "holdSteady":
      return tHelper("scanGuidanceHoldSteady");
    case "reading":
      return scanMode === "mrz"
        ? tHelper("scanGuidanceReadingMrz")
        : tHelper("scanGuidanceReadingBarcode");
    case "detected":
      return scanMode === "mrz"
        ? tHelper("scanGuidanceDetectedMrz")
        : tHelper("scanGuidanceDetectedBarcode");
    case "searching":
    default:
      return scanMode === "mrz"
        ? tHelper("scanGuidanceSearchingMrz")
        : tHelper("scanGuidanceSearchingBarcode");
  }
}

export default function ScanGuidanceOverlay({
  title,
  subtitle,
  scanMode,
  guidance,
  detectionBox,
  debugCapture,
  onDebugCapture,
  onCancel,
  zoneFrame = false,
  codeBox,
}: Props) {
  const insets = useSafeAreaInsets();
  const isMrz = scanMode === "mrz";
  const showDetected = guidance === "detected";
  const showReading = guidance === "reading";
  const [overlaySize, setOverlaySize] = React.useState({ width: 0, height: 0 });
  const [isTipsCollapsed, setIsTipsCollapsed] = React.useState(false);

  const handleOverlayLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setOverlaySize({ width, height });
  }, []);

  const detectionStyle = React.useMemo(() => {
    if (!isMrz || !detectionBox || overlaySize.width <= 0 || overlaySize.height <= 0) {
      return null;
    }

    const left = Math.max(0, Math.min(overlaySize.width - 16, detectionBox.x * overlaySize.width));
    const top = Math.max(0, Math.min(overlaySize.height - 16, (1 - detectionBox.y - detectionBox.height) * overlaySize.height));
    const width = Math.max(24, Math.min(overlaySize.width - left, detectionBox.width * overlaySize.width));
    const height = Math.max(18, Math.min(overlaySize.height - top, detectionBox.height * overlaySize.height));

    return { left, top, width, height };
  }, [detectionBox, isMrz, overlaySize.height, overlaySize.width]);

  const codeStyle = React.useMemo(() => {
    if (isMrz || !codeBox || overlaySize.width <= 0 || overlaySize.height <= 0) {
      return null;
    }
    return {
      left: codeBox.x * overlaySize.width,
      top: codeBox.y * overlaySize.height,
      width: codeBox.width * overlaySize.width,
      height: codeBox.height * overlaySize.height,
    };
  }, [codeBox, isMrz, overlaySize.height, overlaySize.width]);

  // The interface turns with the phone on the scan screens. Sideways, the
  // notch and home bar are at the sides (the insets say which) and there is
  // little height, so things sit closer to the edges.
  const window = useWindowDimensions();
  const turned = window.width > window.height;
  const edge = {
    top: insets.top + (turned ? 12 : 10),
    left: insets.left + 16,
    right: insets.right + 16,
  };

  const controls = (
    <>
      {onCancel ? (
        <View style={[styles.topRightActions, { top: edge.top, right: edge.right }]}>
          {isMrz && onDebugCapture ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Capture debug frame"
              onPress={onDebugCapture}
              style={({ pressed }) => [
                styles.debugButton,
                pressed ? styles.cancelButtonPressed : undefined,
              ]}
            >
              <Text style={styles.debugButtonText}>Debug frame</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tHelper("cancel")}
            onPress={onCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed ? styles.cancelButtonPressed : undefined,
            ]}
          >
            <Text style={styles.cancelButtonText}>{tHelper("cancel")}</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tHelper(isTipsCollapsed ? "scanTipsShow" : "scanTipsHide")}
        onPress={() => setIsTipsCollapsed((current) => !current)}
        style={({ pressed }) => [
          styles.headerCard,
          isTipsCollapsed ? styles.headerCardCollapsed : undefined,
          pressed ? styles.headerCardPressed : undefined,
          { top: edge.top, left: edge.left, right: edge.right + 96 },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.headerToggle}>{tHelper(isTipsCollapsed ? "scanTipsShow" : "scanTipsHide")}</Text>
        </View>
        {!isTipsCollapsed ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </Pressable>

      {/* Where the zone goes: about its own shape, across the middle. */}
      {zoneFrame ? (
        <View
          pointerEvents="none"
          style={[
            styles.zoneFrameArea,
            { paddingLeft: edge.left - 4, paddingRight: edge.right - 4 },
          ]}
        >
          <View style={styles.zoneFrame} />
        </View>
      ) : null}

      <View
        pointerEvents="none"
        style={[
          styles.feedbackPill,
          turned
            ? { bottom: 14, left: edge.left + 60, right: edge.right + 60 }
            : null,
          showDetected ? styles.feedbackPillDetected : null,
          showReading ? styles.feedbackPillReading : null,
        ]}
      >
        <Text style={styles.feedbackText}>{guidanceLabel(guidance, scanMode)}</Text>
      </View>
    </>
  );

  return (
    <View pointerEvents="box-none" onLayout={handleOverlayLayout} style={styles.overlay}>
      {controls}

      {isMrz && detectionStyle ? <View pointerEvents="none" style={[styles.detectedMrzBox, detectionStyle]} /> : null}

      {codeStyle ? <BarcodeHighlight box={codeStyle} read={showDetected} /> : null}

      {isMrz && debugCapture ? (
        <View style={styles.debugPanel}>
          <Text style={styles.debugPanelTitle}>Debug capture</Text>
          <Text style={styles.debugPanelText}>
            OCR text boxes found: {debugCapture.rawObservationCount}
          </Text>
          <Text style={styles.debugPanelText}>
            Crop rect: x {debugCapture.cropRect.x.toFixed(3)} y {debugCapture.cropRect.y.toFixed(3)} w {debugCapture.cropRect.width.toFixed(3)} h {debugCapture.cropRect.height.toFixed(3)}
          </Text>
          <View style={styles.debugPreviewRow}>
            <View style={styles.debugPreviewCard}>
              <Text style={styles.debugPreviewLabel}>Full frame</Text>
              <Image resizeMode="contain" source={{ uri: debugCapture.fullFrameDataUrl }} style={styles.debugPreviewImage} />
            </View>
            <View style={styles.debugPreviewCard}>
              <Text style={styles.debugPreviewLabel}>OCR input</Text>
              <Image resizeMode="contain" source={{ uri: debugCapture.cropFrameDataUrl }} style={styles.debugPreviewImage} />
            </View>
          </View>
          <Text style={styles.debugPanelText}>Top OCR strings:</Text>
          <ScrollView style={styles.debugPreviewStrings}>
            {(debugCapture.recognizedPreview.length > 0 ? debugCapture.recognizedPreview : ["(none)"]).map((line, index) => (
              <Text key={`${line}-${index}`} style={styles.debugPreviewString}>{line}</Text>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  topRightActions: {
    position: "absolute",
    top: 18,
    right: 16,
    zIndex: 3,
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(10,16,30,0.78)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.3)",
  },
  debugButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(18,89,255,0.78)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.3)",
  },
  cancelButtonPressed: {
    opacity: 0.82,
  },
  debugButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  headerCard: {
    position: "absolute",
    top: 18,
    left: 16,
    right: 112,
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "rgba(10,16,30,0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  headerCardCollapsed: {
    paddingVertical: 12,
  },
  headerCardPressed: {
    opacity: 0.92,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: "#fff",
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "left",
  },
  headerToggle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  subtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "left",
  },
  detectedMrzBox: {
    position: "absolute",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(68, 214, 182, 0.96)",
    backgroundColor: "rgba(68, 214, 182, 0.12)",
  },
  zoneFrameArea: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
  },
  zoneFrame: {
    // A passport's zone is a little over five times as wide as it is tall.
    aspectRatio: 4.4,
    maxHeight: "42%",
    alignSelf: "center",
    width: "100%",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  feedbackPill: {
    position: "absolute",
    bottom: 72,
    left: 24,
    right: 24,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "rgba(10,16,30,0.7)",
  },
  feedbackPillDetected: {
    backgroundColor: "rgba(22,163,74,0.82)",
  },
  feedbackPillReading: {
    backgroundColor: "rgba(37,99,235,0.82)",
  },
  feedbackText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  debugPanel: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 134,
    borderRadius: 18,
    backgroundColor: "rgba(10,16,30,0.82)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
    padding: 14,
    gap: 8,
  },
  debugPanelTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  debugPanelText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    lineHeight: 16,
  },
  debugPreviewRow: {
    flexDirection: "row",
    gap: 10,
  },
  debugPreviewCard: {
    flex: 1,
    gap: 6,
  },
  debugPreviewLabel: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "600",
  },
  debugPreviewImage: {
    width: "100%",
    aspectRatio: 1.2,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  debugPreviewStrings: {
    maxHeight: 84,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  debugPreviewString: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    lineHeight: 16,
  },
});
