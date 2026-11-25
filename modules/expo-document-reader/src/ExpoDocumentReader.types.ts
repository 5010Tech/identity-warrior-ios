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

/** One line of text as the recognizer read it (see features/mrz/mrzAssembler). */
export type ExpoDocumentReaderMrzLine = {
  text: string;
  alternates?: string[];
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Strict reading: the text lines of one camera frame (none when it showed no
 * text), placed in the whole frame, and the frame's size in pixels as it
 * was read (already turned upright).
 */
export type ExpoDocumentReaderMrzCandidates = {
  lines: ExpoDocumentReaderMrzLine[];
  imageWidth?: number;
  imageHeight?: number;
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
  /**
   * MRZ mode: hand every frame's text lines to onMrzCandidates and leave it
   * to JavaScript to accept a zone (check digits and all). onMrzScanned is
   * then not sent. A build without this prop ignores it and sends
   * onMrzScanned as before.
   */
  strictMrz?: boolean;
  onMrzCandidates?: (event: {
    nativeEvent: ExpoDocumentReaderMrzCandidates;
  }) => void;
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
