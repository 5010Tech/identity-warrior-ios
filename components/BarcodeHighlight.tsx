import React from "react";
import { StyleSheet, View } from "react-native";

export type BarcodeBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Props = {
  /** Where the code is, in points of the camera view. */
  box: BarcodeBox;
  /** The code has been read: drawn in green. */
  read?: boolean;
};

/** An outline over a barcode the camera has picked up. */
export default function BarcodeHighlight({ box, read = false }: Props) {
  // A little larger than the code, so its edge stays visible.
  const pad = 6;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.box,
        read ? styles.read : null,
        {
          left: box.left - pad,
          top: box.top - pad,
          width: Math.max(24, box.width + pad * 2),
          height: Math.max(18, box.height + pad * 2),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    position: "absolute",
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "rgba(250, 204, 21, 0.96)",
    backgroundColor: "rgba(250, 204, 21, 0.14)",
  },
  read: {
    borderColor: "rgba(34, 197, 94, 0.98)",
    backgroundColor: "rgba(34, 197, 94, 0.22)",
  },
});
