import { requireNativeViewManager } from "expo-modules-core";
import * as React from "react";
import { ExpoNeoScanViewProps } from "./ExpoNeoScan.types";

const NativeView: React.ComponentType<ExpoNeoScanViewProps> =
  requireNativeViewManager("ExpoNeoScan");

export default function ExpoNeoScanView(props: ExpoNeoScanViewProps) {
  return <NativeView {...props} />;
}
