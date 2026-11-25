import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { BiographicData } from "@/types/BiographicData";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import {
  BarcodeScanningResult,
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Button, StyleSheet, Text, View } from "react-native";
import { Button as AppButton } from "@/components/Button";
import BarcodeHighlight, { BarcodeBox } from "@/components/BarcodeHighlight";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tHelper } from "@/translations/translationHelper";

// How long a code stays outlined before it is taken, and how long an outline
// stays up after the camera last saw its code.
const SHOW_MS = 500;
const STALE_MS = 600;

type Sighting = { box: BarcodeBox | null; count: number; last: number };

export default function App() {
  const [facing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const cameraRef = useRef<CameraView | null>(null);
  const scanned = useRef(false);
  const isFocused = useIsFocused();
  const { setValue } = useFormContext<BiographicData>();
  const { getValue } = useAutofill();
  const insets = useSafeAreaInsets();
  // Every code in view, by what it says: outlined on screen as it is seen.
  const sightings = useRef<Record<string, Sighting>>({});
  const [boxes, setBoxes] = useState<Record<string, BarcodeBox>>({});
  const [taken, setTaken] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const showBoxes = useCallback(() => {
    const next: Record<string, BarcodeBox> = {};
    for (const [data, seen] of Object.entries(sightings.current)) {
      if (seen.box) next[data] = seen.box;
    }
    setBoxes(next);
  }, []);

  // Outlines go when their code has left the view.
  useEffect(() => {
    const tick = setInterval(() => {
      if (scanned.current) return;
      const now = Date.now();
      let changed = false;
      for (const [data, seen] of Object.entries(sightings.current)) {
        if (now - seen.last > STALE_MS) {
          delete sightings.current[data];
          changed = true;
        }
      }
      if (changed) showBoxes();
    }, 250);
    return () => {
      clearInterval(tick);
      timers.current.forEach(clearTimeout);
    };
  }, [showBoxes]);

  // Each time the screen comes up it starts again. The camera itself is only
  // loaded while the screen is showing, so there is nothing to pause or
  // resume here (asking it to, as it loads or unloads, fails).
  useFocusEffect(
    useCallback(() => {
      scanned.current = false;
      sightings.current = {};
      setBoxes({});
      setTaken(null);
    }, []),
  );

  const take = (data: string) => {
    setValue("dnaId", data, { shouldDirty: true, shouldValidate: true });
    // DNA System Name defaults from Settings: Type-2 in DoD mode, Autofill in DHS.
    const isDod = getValue("appSettings")?.collectionMode !== "DHS";
    const dnaSystem = isDod
      ? getValue("type2Settings")?.dnaSystem
      : getValue("biographics")?.dnaSystem;
    setValue("dnaSystem", dnaSystem);
    router.back();
  };

  const handleBarCodeScanned = ({ data, bounds }: BarcodeScanningResult) => {
    if (scanned.current || !data) return; // ignore further scans
    const size = bounds?.size;
    const box =
      size && size.width > 0 && size.height > 0
        ? {
            left: bounds.origin.x,
            top: bounds.origin.y,
            width: size.width,
            height: size.height,
          }
        : null;
    const first = !Object.keys(sightings.current).length;
    const seen = sightings.current[data];
    sightings.current[data] = {
      box: box ?? seen?.box ?? null,
      count: (seen?.count ?? 0) + 1,
      last: Date.now(),
    };
    showBoxes();
    if (!first) return;
    // The first code into view starts the clock: its outline shows, then
    // the code seen most often since is taken, in green, and the screen
    // closes.
    timers.current.push(
      setTimeout(() => {
        if (scanned.current) return;
        const best = Object.entries(sightings.current).sort(
          (a, b) => b[1].count - a[1].count,
        )[0];
        if (!best) return;
        scanned.current = true;
        setTaken(best[0]);
        timers.current.push(setTimeout(() => take(best[0]), 350));
      }, SHOW_MS),
    );
  };

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>{tHelper("cameraPerm")}</Text>
        <Button onPress={requestPermission} title={tHelper("cameraPerm")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
          autofocus="on"
          videoQuality="2160p"
          // Linear barcodes and 2D codes, QR included.
          barcodeScannerSettings={{
            barcodeTypes: [
              "qr",
              "datamatrix",
              "pdf417",
              "aztec",
              "code128",
              "code39",
              "code93",
              "codabar",
              "itf14",
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
            ],
          }}
          onBarcodeScanned={handleBarCodeScanned}
        />
      )}
      {Object.entries(boxes).map(([data, box]) =>
        // Once a code is taken only that one stays outlined.
        taken && taken !== data ? null : (
          <BarcodeHighlight key={data} box={box} read={taken === data} />
        ),
      )}
      <View style={[styles.cancel, { bottom: insets.bottom + 16 }]}>
        <AppButton
          text={tHelper("cancel")}
          variant="secondary"
          onPress={router.back}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  cancel: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: "flex-end",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
});
