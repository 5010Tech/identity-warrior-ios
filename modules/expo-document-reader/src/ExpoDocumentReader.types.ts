import type { StyleProp, ViewStyle } from "react-native";

export type ExpoDocumentReaderScanMode = "pdf417" | "mrz";

export type ExpoDocumentReaderScanGuidance =
  | "searching"
  | "moveCloser"
  | "moveFarther"
  | "moveLeft"
  | "moveRight"
  | "moveUp"
  | "moveDown"
  | "alignBottom"
  | "holdSteady"
  | "reading"
  | "detected";

export type ExpoDocumentReaderBarcodeScanResult = {
  data: string;
  type: "pdf417";
};

export type ExpoDocumentReaderMrzScanResult = {
  text: string;
  type: "mrz";
};

export type ExpoDocumentReaderNormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ExpoDocumentReaderScanFeedback = {
  guidance: ExpoDocumentReaderScanGuidance;
  type: ExpoDocumentReaderScanMode;
  candidateBox?: ExpoDocumentReaderNormalizedRect | null;
};

export type ExpoDocumentReaderDebugCapture = {
  fullFrameDataUrl: string;
  cropFrameDataUrl: string;
  cropRect: ExpoDocumentReaderNormalizedRect;
  viewFrameRect: ExpoDocumentReaderNormalizedRect;
  rawObservationCount: number;
  recognizedPreview: string[];
};

export type ExpoDocumentReaderViewProps = {
  scanMode?: ExpoDocumentReaderScanMode;
  isScanningEnabled?: boolean;
  debugCaptureToken?: number;
  onBarcodeScanned?: (event: {
    nativeEvent: ExpoDocumentReaderBarcodeScanResult;
  }) => void;
  onMrzScanned?: (event: {
    nativeEvent: ExpoDocumentReaderMrzScanResult;
  }) => void;
  onDebugCapture?: (event: {
    nativeEvent: ExpoDocumentReaderDebugCapture;
  }) => void;
  onScanFeedback?: (event: {
    nativeEvent: ExpoDocumentReaderScanFeedback;
  }) => void;
  style?: StyleProp<ViewStyle>;
};
