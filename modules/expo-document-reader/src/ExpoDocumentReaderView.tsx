import { requireNativeView } from "expo";
import * as React from "react";

import type { ExpoDocumentReaderViewProps } from "./ExpoDocumentReader.types";

const NativeView: React.ComponentType<ExpoDocumentReaderViewProps> =
  requireNativeView("ExpoDocumentReader");

export default function ExpoDocumentReaderView(
  props: ExpoDocumentReaderViewProps,
) {
  return <NativeView {...props} />;
}
