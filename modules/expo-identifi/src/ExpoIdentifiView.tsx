import { requireNativeViewManager } from "expo-modules-core";
import * as React from "react";

import { ExpoIdentifiViewProps } from "./ExpoIdentifi.types";

const NativeView: React.ComponentType<ExpoIdentifiViewProps> =
  requireNativeViewManager("ExpoIdentifi");

export default function ExpoIdentifiView(props: ExpoIdentifiViewProps) {
  return <NativeView {...props} />;
}
