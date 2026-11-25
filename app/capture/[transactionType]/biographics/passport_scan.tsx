import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { Button } from "@/components/Button";
import ScanGuidanceOverlay from "@/components/ScanGuidanceOverlay";
import { SafeAreaView, Text, useThemeColor } from "@/components/themed";
import { useAllowCamera } from "@/components/useAllowCamera";
import { canKeyChip, readChip } from "@/features/mrz/chipRead";
import {
  describeAttempt,
  findMrz,
  MrzReadTracker,
  zoneBox,
} from "@/features/mrz/mrzAssembler";
import {
  fullyValid,
  isoDate,
  mrzDate,
  MrzRecord,
  parseMrzText,
} from "@/features/mrz/mrzRecord";
import {
  ExpoDocumentReaderDebugCapture,
  ExpoDocumentReaderMrzCandidates,
  ExpoDocumentReaderMrzScanResult,
  ExpoDocumentReaderScanFeedback,
  ExpoDocumentReaderView,
} from "@/modules/expo-document-reader";
import { tHelper } from "@/translations/translationHelper";
import { BiographicData } from "@/types";
import { applyMRZScanResult } from "@/util/biographicScans";
import { logEvent } from "@/util/fieldLog";
import { toMrzData } from "@/util/mrzParser";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

/**
 * Scans the printed machine-readable zone of a passport, ID card or visa
 * and fills the biographics form from it. Opened with `chip=1` (the NFC
 * drawer item) the scan is step one of a chip read, as on Android: the zone
 * is held back, the operator confirms its key fields, the chip is read with
 * them, and the form is filled from the chip. If the chip cannot be read the
 * operator may use the printed zone instead.
 */
export default function PassportScan() {
  const debugEnabled = false;
  const router = useRouter();
  const { chip } = useLocalSearchParams<{ chip?: string }>();
  const forChip = chip === "1";
  const cameraPermission = useAllowCamera();
  const isFocused = useIsFocused();
  const didHandleScan = useRef(false);
  // The same zone has to be read more than once before it is used.
  const tracker = useRef(new MrzReadTracker());
  // Set by the first frame of text lines: this build reads strictly, and the
  // view's own looser result is not wanted.
  const strict = useRef(false);
  // When the log was last told why a zone in view was not read.
  const lastWhy = useRef(0);
  const [debugCaptureToken, setDebugCaptureToken] = useState(0);
  const [debugCapture, setDebugCapture] =
    useState<ExpoDocumentReaderDebugCapture | null>(null);
  const [scanFeedback, setScanFeedback] =
    useState<ExpoDocumentReaderScanFeedback>({
      guidance: "searching",
      type: "mrz",
      candidateBox: null,
    });
  // The chip read: the zone it is keyed from, and how the read stands.
  const [printed, setPrinted] = useState<MrzRecord | null>(null);
  const [reading, setReading] = useState(false);
  const [failed, setFailed] = useState(false);
  const { setValue, getValues } = useFormContext<BiographicData>();
  // DoD: a scan overwrites what is on the form, document included.
  const isDod = useAutofillSelector(
    (s) => s.appSettings?.collectionMode !== "DHS",
  );

  const background = useThemeColor({}, "background");
  const strong = useThemeColor({}, "textStrong");
  const muted = useThemeColor({}, "textSecondary");
  const danger = useThemeColor({}, "danger");

  useEffect(() => {
    if (isFocused) {
      return;
    }

    didHandleScan.current = false;
    tracker.current.reset();
    setPrinted(null);
    setReading(false);
    setFailed(false);
    setDebugCapture(null);
    setDebugCaptureToken(0);
    setScanFeedback({
      guidance: "searching",
      type: "mrz",
      candidateBox: null,
    });
  }, [isFocused]);

  // The camera picture fills the view, cropped at the sides or at top and
  // bottom. A box on the frame (0 to 1, y upward) is placed over it the same
  // way, in the terms the overlay draws in.
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  const window = useWindowDimensions();
  const turned = window.width > window.height;
  const onPreview = useCallback(
    (
      box: { x: number; y: number; width: number; height: number },
      imageWidth?: number,
      imageHeight?: number,
    ) => {
      const { width, height } = viewSize;
      if (!width || !height || !imageWidth || !imageHeight) return null;
      const scale = Math.max(width / imageWidth, height / imageHeight);
      const shownWidth = imageWidth * scale;
      const shownHeight = imageHeight * scale;
      const offsetX = (width - shownWidth) / 2;
      const offsetY = (height - shownHeight) / 2;
      return {
        x: (offsetX + box.x * shownWidth) / width,
        y: (offsetY + box.y * shownHeight) / height,
        width: (box.width * shownWidth) / width,
        height: (box.height * shownHeight) / height,
      };
    },
    [viewSize],
  );
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewSize({ width, height });
  }, []);

  /** Fills the form and goes back, warning first if the document has expired. */
  const finish = useCallback(
    (record: MrzRecord, source: "MRZ scan" | "NFC chip read") => {
      const apply = () => {
        applyMRZScanResult(toMrzData(record), setValue, getValues, source, isDod);
        router.back();
      };
      const expiry = mrzDate(record.expirationDate, "expiry");
      if (expiry && expiry < new Date(new Date().setHours(0, 0, 0, 0))) {
        Alert.alert(
          tHelper("passportExpiredTitle"),
          tHelper("passportExpiredOn").replace("{0}", isoDate(expiry)),
          [{ text: tHelper("ok"), onPress: apply }],
        );
        return;
      }
      apply();
    },
    [getValues, isDod, router, setValue],
  );

  /** A zone that passed its check digits often enough. */
  const accept = useCallback(
    (record: MrzRecord) => {
      if (didHandleScan.current) return;
      didHandleScan.current = true;
      logEvent(
        "mrz",
        `zone read: ${record.format}, check digits ${fullyValid(record) ? "all right" : "partly right"}`,
      );
      setScanFeedback((current) => ({ ...current, guidance: "detected" }));
      if (!forChip) {
        finish(record, "MRZ scan");
        return;
      }
      if (!canKeyChip(record)) {
        Alert.alert(tHelper("drawerNfcScan"), tHelper("nfcMrzMissingDob"), [
          {
            text: tHelper("ok"),
            onPress: () => {
              tracker.current.reset();
              didHandleScan.current = false;
            },
          },
        ]);
        return;
      }
      setPrinted(record);
    },
    [finish, forChip],
  );

  // Strict reading: the text lines of each frame, tested here. What the
  // operator is told and shown comes from the same lines: where the zone is,
  // and whether it is being read, is too small, or is not in view.
  const handleMrzCandidates = useCallback(
    ({ nativeEvent }: { nativeEvent: ExpoDocumentReaderMrzCandidates }) => {
      strict.current = true;
      if (didHandleScan.current) return;
      const lines = nativeEvent.lines ?? [];
      const zone = zoneBox(lines);
      const found = zone ? findMrz(lines) : null;
      setScanFeedback({
        type: "mrz",
        guidance: !zone
          ? "searching"
          : found
            ? "reading"
            : zone.width < 0.5
              ? "moveCloser"
              : "holdSteady",
        candidateBox: zone
          ? onPreview(zone, nativeEvent.imageWidth, nativeEvent.imageHeight)
          : null,
      });
      if (!found) {
        // A zone in view that will not read: say why in the log, now and
        // then (shapes and check digits only, never the text).
        if (zone && Date.now() - lastWhy.current > 3000) {
          lastWhy.current = Date.now();
          logEvent(
            "mrz",
            `zone in view, not read (${turned ? "sideways" : "upright"}, ` +
              `${nativeEvent.imageWidth ?? "?"}x${nativeEvent.imageHeight ?? "?"}, ` +
              `zone ${Math.round(zone.width * 100)}% of the width): ${describeAttempt(lines)}`,
          );
        }
        return;
      }
      const settled = tracker.current.add(found);
      if (settled) accept(settled);
    },
    [accept, onPreview, turned],
  );

  // A build from before strict reading sends its own result instead.
  const handleMrzScanned = useCallback(
    ({ nativeEvent }: { nativeEvent: ExpoDocumentReaderMrzScanResult }) => {
      if (strict.current || didHandleScan.current) return;
      const record = parseMrzText(nativeEvent.text);
      if (record) accept(record);
    },
    [accept],
  );

  // The view's own guidance, for a build from before strict reading only.
  const handleScanFeedback = useCallback(
    ({ nativeEvent }: { nativeEvent: ExpoDocumentReaderScanFeedback }) => {
      if (strict.current || didHandleScan.current) return;
      // Its box is worked out for an upright interface.
      setScanFeedback(
        turned ? { ...nativeEvent, candidateBox: null } : nativeEvent,
      );
    },
    [turned],
  );

  const handleDebugCapture = useCallback(
    ({ nativeEvent }: { nativeEvent: ExpoDocumentReaderDebugCapture }) => {
      setDebugCapture(nativeEvent);
    },
    [],
  );

  const startChipRead = async () => {
    if (!printed || reading) return;
    setFailed(false);
    setReading(true);
    try {
      finish(await readChip(printed), "NFC chip read");
    } catch {
      setFailed(true);
    } finally {
      setReading(false);
    }
  };

  if (!cameraPermission || !cameraPermission.granted) {
    return <View style={styles.container} />;
  }

  // Step two of a chip read: confirm what the zone said, then read the chip.
  if (printed) {
    const date = (yymmdd: string, kind: "birth" | "expiry") => {
      const value = mrzDate(yymmdd, kind);
      return value ? isoDate(value) : yymmdd;
    };
    return (
      <SafeAreaView style={[styles.confirm, { backgroundColor: background }]}>
        <View style={styles.confirmBody}>
          <Text style={[styles.confirmTitle, { color: strong }]}>
            {tHelper("nfcConfirmTitle")}
          </Text>
          <Text style={[styles.confirmRow, { color: strong }]}>
            {tHelper("nfcDocNumberLabel").replace(
              "{0}",
              printed.documentNumber,
            )}
          </Text>
          <Text style={[styles.confirmRow, { color: strong }]}>
            {tHelper("nfcDobLabel").replace(
              "{0}",
              date(printed.dateOfBirth, "birth"),
            )}
          </Text>
          <Text style={[styles.confirmRow, { color: strong }]}>
            {tHelper("nfcExpiryLabel").replace(
              "{0}",
              date(printed.expirationDate, "expiry"),
            )}
          </Text>
          <Text
            style={[styles.confirmHint, { color: failed ? danger : muted }]}
          >
            {tHelper(failed ? "nfcReadFailed" : "nfcReviewInstruction")}
          </Text>
          {reading && <ActivityIndicator size="large" color={strong} />}
        </View>
        <View style={styles.confirmButtons}>
          <Button
            icon="nfc"
            text={tHelper(failed ? "nfcTryAgain" : "nfcStartScan")}
            disabled={reading}
            onPress={startChipRead}
          />
          {failed && (
            <Button
              variant="secondary"
              text={tHelper("nfcUseMrzOnly")}
              disabled={reading}
              onPress={() => finish(printed, "MRZ scan")}
            />
          )}
          <Button
            variant="secondary"
            text={tHelper("cancel")}
            disabled={reading}
            onPress={router.back}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {isFocused ? (
        <ExpoDocumentReaderView
          style={StyleSheet.absoluteFill}
          scanMode="mrz"
          strictMrz
          isScanningEnabled={isFocused}
          debugCaptureToken={debugEnabled ? debugCaptureToken : 0}
          onMrzScanned={handleMrzScanned}
          onMrzCandidates={handleMrzCandidates}
          onDebugCapture={debugEnabled ? handleDebugCapture : undefined}
          onScanFeedback={handleScanFeedback}
        />
      ) : null}
      <ScanGuidanceOverlay
        title={tHelper("scanPassportMrz")}
        subtitle={tHelper("scanMrzFrameTip")}
        scanMode="mrz"
        zoneFrame
        guidance={scanFeedback.guidance}
        detectionBox={scanFeedback.candidateBox}
        debugCapture={debugEnabled ? debugCapture : null}
        onDebugCapture={
          debugEnabled
            ? () => setDebugCaptureToken((current) => current + 1)
            : undefined
        }
        onCancel={router.back}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  confirm: { flex: 1, padding: 16 },
  confirmBody: { flex: 1, justifyContent: "center", gap: 12 },
  confirmTitle: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  confirmRow: { fontSize: 18 },
  confirmHint: { fontSize: 16, marginTop: 12 },
  confirmButtons: { gap: 10 },
});
