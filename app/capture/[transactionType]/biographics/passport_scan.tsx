import ScanGuidanceOverlay from "@/components/ScanGuidanceOverlay";
import {
  ExpoDocumentReaderDebugCapture,
  ExpoDocumentReaderMrzScanResult,
  ExpoDocumentReaderScanFeedback,
  ExpoDocumentReaderView,
} from "@/modules/expo-document-reader";
import { useAllowCamera } from "@/components/useAllowCamera";
import { tHelper } from "@/translations/translationHelper";
import { BiographicData } from "@/types";
import { applyMRZScanResult } from "@/util/biographicScans";
import { parseMRZ } from "@/util/mrzParser";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { StyleSheet, View } from "react-native";

export default function PassportScan() {
  const debugEnabled = false;
  const router = useRouter();
  const cameraPermission = useAllowCamera();
  const isFocused = useIsFocused();
  const didHandleScan = useRef(false);
  const [debugCaptureToken, setDebugCaptureToken] = useState(0);
  const [debugCapture, setDebugCapture] = useState<ExpoDocumentReaderDebugCapture | null>(null);
  const [scanFeedback, setScanFeedback] = useState<ExpoDocumentReaderScanFeedback>({
    guidance: "searching",
    type: "mrz",
    candidateBox: null,
  });
  const { setValue, getValues } = useFormContext<BiographicData>();

  useEffect(() => {
    if (isFocused) {
      return;
    }

    didHandleScan.current = false;
    setDebugCapture(null);
    setDebugCaptureToken(0);
    setScanFeedback({
      guidance: "searching",
      type: "mrz",
      candidateBox: null,
    });
  }, [isFocused]);

  const handleMrzScanned = useCallback(
    ({ nativeEvent }: { nativeEvent: ExpoDocumentReaderMrzScanResult }) => {
      if (didHandleScan.current) {
        return;
      }

      didHandleScan.current = true;

      try {
        const parsed = parseMRZ(nativeEvent.text);
        applyMRZScanResult(parsed, setValue, getValues);
        router.back();
      } catch (error) {
        console.error("Failed to parse MRZ", error);
        didHandleScan.current = false;
        setScanFeedback((current) => ({ ...current, guidance: "searching", candidateBox: null }));
      }
    },
    [getValues, router, setValue],
  );

  const handleScanFeedback = useCallback(
    ({ nativeEvent }: { nativeEvent: ExpoDocumentReaderScanFeedback }) => {
      if (!didHandleScan.current) {
        setScanFeedback(nativeEvent);
      }
    },
    [],
  );

  const handleDebugCapture = useCallback(
    ({ nativeEvent }: { nativeEvent: ExpoDocumentReaderDebugCapture }) => {
      setDebugCapture(nativeEvent);
    },
    [],
  );

  if (!cameraPermission || !cameraPermission.granted) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {isFocused ? (
        <ExpoDocumentReaderView
          style={StyleSheet.absoluteFill}
          scanMode="mrz"
          isScanningEnabled={isFocused}
          debugCaptureToken={debugEnabled ? debugCaptureToken : 0}
          onMrzScanned={handleMrzScanned}
          onDebugCapture={debugEnabled ? handleDebugCapture : undefined}
          onScanFeedback={handleScanFeedback}
        />
      ) : null}
      <ScanGuidanceOverlay
        title={tHelper("scanPassportMrz")}
        subtitle={`${tHelper("scanPassportMrzSubtitle")} Hold the passport vertically so the MRZ runs up and down, with the top MRZ line on the right.`}
        scanMode="mrz"
        guidance={scanFeedback.guidance}
        detectionBox={scanFeedback.candidateBox}
        debugCapture={debugEnabled ? debugCapture : null}
        onDebugCapture={debugEnabled ? () => setDebugCaptureToken((current) => current + 1) : undefined}
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
});
