import * as React from "react";
import { View } from "react-native";

import type { ExpoDocumentReaderViewProps } from "./ExpoDocumentReader.types";

export default function ExpoDocumentReaderView(
  props: ExpoDocumentReaderViewProps,
) {
  return <View style={props.style} />;
}
