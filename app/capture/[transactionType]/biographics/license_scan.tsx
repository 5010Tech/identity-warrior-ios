import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import ScanGuidanceOverlay from "@/components/ScanGuidanceOverlay";
import { useAllowCamera } from "@/components/useAllowCamera";
import {
  ExpoDocumentReaderBarcodeScanResult,
  ExpoDocumentReaderScanFeedback,
  ExpoDocumentReaderView,
} from "@/modules/expo-document-reader";
import { tHelper } from "@/translations/translationHelper";
import { BiographicData } from "@/types/BiographicData";
import { applyDLScanResult } from "@/util/biographicScans";
import { parseDL } from "@/util/dlParser";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { StyleSheet, View } from "react-native";

export default function LicenseBarcodeScan() {
  const router = useRouter();
  const cameraPermission = useAllowCamera();
  const isFocused = useIsFocused();
  const didHandleScan = useRef(false);
  const leaving = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (leaving.current) clearTimeout(leaving.current);
    },
    [],
  );
  // The screen stays loaded after it closes, so each time it comes up it
  // starts again: nothing read yet, and no outline left from the last scan.
  useEffect(() => {
    if (!isFocused) return;
    didHandleScan.current = false;
    setScanFeedback({ guidance: "searching", type: "pdf417", candidateBox: null });
  }, [isFocused]);
  const [scanFeedback, setScanFeedback] = useState<ExpoDocumentReaderScanFeedback>({
    guidance: "searching",
    type: "pdf417",
    candidateBox: null,
  });
  const { setValue, getValues } = useFormContext<BiographicData>();
  // DoD: a scan overwrites what is on the form, document included.
  const isDod = useAutofillSelector(
    (s) => s.appSettings?.collectionMode !== "DHS",
  );

  const handleBarcodeScanned = useCallback(
    ({ nativeEvent }: { nativeEvent: ExpoDocumentReaderBarcodeScanResult }) => {
      const { data } = nativeEvent;

      if (didHandleScan.current) {
        return;
      }

      didHandleScan.current = true;

      try {
        const parsed = parseDL(data);
        applyDLScanResult(parsed, setValue, getValues, isDod);
        // Leave the outline up, in green, long enough to be seen.
        setScanFeedback((current) => ({ ...current, guidance: "detected" }));
        leaving.current = setTimeout(() => router.back(), 450);
      } catch (error) {
        console.error("Failed to parse PDF417 barcode", error);
        didHandleScan.current = false;
        setScanFeedback((current) => ({ ...current, guidance: "searching", candidateBox: null }));
      }
    },
    [getValues, isDod, router, setValue],
  );

  const handleScanFeedback = useCallback(
    ({ nativeEvent }: { nativeEvent: ExpoDocumentReaderScanFeedback }) => {
      if (!didHandleScan.current) {
        setScanFeedback(nativeEvent);
      }
    },
    [],
  );

  if (!cameraPermission) {
    return <View style={styles.container} />;
  }

  if (!cameraPermission.granted) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {isFocused ? (
        <ExpoDocumentReaderView
          style={StyleSheet.absoluteFill}
          scanMode="pdf417"
          isScanningEnabled={isFocused}
          onBarcodeScanned={handleBarcodeScanned}
          onScanFeedback={handleScanFeedback}
        />
      ) : null}
      <ScanGuidanceOverlay
        title={tHelper("scanLicenseBarcode")}
        subtitle={tHelper("scanLicenseBarcodeSubtitle")}
        scanMode="pdf417"
        guidance={scanFeedback.guidance}
        codeBox={scanFeedback.candidateBox}
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
