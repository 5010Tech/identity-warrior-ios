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
import React, { useCallback, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { StyleSheet, View } from "react-native";

export default function LicenseBarcodeScan() {
  const router = useRouter();
  const cameraPermission = useAllowCamera();
  const isFocused = useIsFocused();
  const didHandleScan = useRef(false);
  const [scanFeedback, setScanFeedback] = useState<ExpoDocumentReaderScanFeedback>({
    guidance: "searching",
    type: "pdf417",
    candidateBox: null,
  });
  const { setValue, getValues } = useFormContext<BiographicData>();

  const handleBarcodeScanned = useCallback(
    ({ nativeEvent }: { nativeEvent: ExpoDocumentReaderBarcodeScanResult }) => {
      const { data } = nativeEvent;

      if (didHandleScan.current) {
        return;
      }

      didHandleScan.current = true;

      try {
        const parsed = parseDL(data);
        applyDLScanResult(parsed, setValue, getValues);
        router.back();
      } catch (error) {
        console.error("Failed to parse PDF417 barcode", error);
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
