import { Button } from "@/components/Button";
import { Text } from "@/components/themed";
import {
  ExpoGrabba,
  GrabbaImageFacts,
  GrabbaInfo,
  GrabbaScan,
  GrabbaScanType,
} from "@/modules/expo-grabba";
import { tHelper } from "@/translations/translationHelper";
import { logEvent } from "@/util/fieldLog";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

// What kind of image it is, for the log: never the image itself.
const facts = (image: GrabbaImageFacts) =>
  `${image.bytes} bytes, starts ${image.magic}, ${image.type ?? "type ?"}, ` +
  `${image.width ?? "?"}x${image.height ?? "?"}, ${image.bitsPerPixel ?? "?"} bits, ` +
  `dpi ${image.dpiX ?? "?"}/${image.dpiY ?? "?"}, per metre ${image.bmpPixelsPerMetre ?? "?"}`;

/**
 * One four-finger scan with the connected Grabba, to see that it works and
 * to record what the device sends. Nothing is kept.
 */
export function GrabbaTestScan({ grabba }: { grabba: GrabbaInfo }) {
  const [state, setState] = useState<"idle" | "scanning" | "done" | "failed">(
    "idle",
  );
  const [scan, setScan] = useState<GrabbaScan | null>(null);
  // What the scanner has said since the scan was asked for.
  const [progress, setProgress] = useState<{ started: boolean; previews: number }>(
    { started: false, previews: 0 },
  );
  useEffect(() => {
    const subscription = ExpoGrabba.onFingerprint(({ state: step, count }) =>
      setProgress((now) =>
        step === "preview"
          ? { started: true, previews: count ?? now.previews + 1 }
          : { ...now, started: true },
      ),
    );
    return () => subscription.remove();
  }, []);

  // Leaving the screen mid-scan stops the scan.
  useEffect(
    () => () => {
      ExpoGrabba.stopFingerprint().catch(() => undefined);
    },
    [],
  );

  const run = async () => {
    setState("scanning");
    setScan(null);
    setProgress({ started: false, previews: 0 });
    try {
      // As WSQ: what the device sends for a record (a picture scan was
      // already seen to be a small JPEG).
      const result = await ExpoGrabba.scanFingerprint(
        GrabbaScanType.fourFingers,
        true,
      );
      logEvent(
        "grabba",
        `test scan: ${facts(result)}; score ${result.nistScore}, ` +
          `compression ${result.compressionType}, ${result.previews} preview(s)` +
          (result.firstPreview ? ` (first: ${facts(result.firstPreview)})` : "") +
          `; finger boxes ${result.segmentBytes ?? 0} bytes ${result.segmentHex ?? ""}` +
          `; took ${result.milliseconds ?? "?"} ms`,
      );
      setScan(result);
      setState("done");
    } catch (error) {
      logEvent("grabba", "test scan failed", error);
      setState("failed");
    }
  };

  // Asleep counts: the scan wakes the device first.
  const ready = !!grabba.fingerprintReady || !!grabba.asleep;
  return (
    <View style={styles.box}>
      <Button
        text={tHelper("grabbaTestScan")}
        variant="secondary"
        disabled={!ready || state === "scanning"}
        onPress={run}
      />
      <Text style={styles.line}>
        {!ready
          ? tHelper("grabbaGettingReady")
          : state === "scanning"
            ? !progress.started
              ? tHelper("grabbaTestStarting")
              : tHelper("grabbaTestPlace") +
                (progress.previews ? ` (${progress.previews})` : "")
            : state === "failed"
              ? tHelper("grabbaTestFailed")
              : state === "done"
                ? `${tHelper("grabbaTestDone")} ${scan?.width ?? "?"} × ${scan?.height ?? "?"}`
                : ""}
      </Text>
      {scan?.png ? (
        <Image
          source={{ uri: `data:image/png;base64,${scan.png}` }}
          resizeMode="contain"
          style={styles.image}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  line: { textAlign: "center" },
  image: { width: "100%", height: 220, backgroundColor: "#fff" },
});
