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
import { useCallback, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Button, StyleSheet, Text, View } from "react-native";
import { Button as AppButton } from "@/components/Button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tHelper } from "@/translations/translationHelper";

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

  useFocusEffect(
    useCallback(() => {
      scanned.current = false;
      cameraRef.current?.resumePreview();

      return () => {
        cameraRef.current?.pausePreview();
      };
    }, []),
  );

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanned.current) return; // ignore further scans
    scanned.current = true;
    setValue("dnaId", data, { shouldDirty: true, shouldValidate: true });
    // DNA System Name defaults from Settings: Type-2 in DoD mode, Autofill in DHS.
    const isDod = getValue("appSettings")?.collectionMode !== "DHS";
    const dnaSystem = isDod
      ? getValue("type2Settings")?.dnaSystem
      : getValue("biographics")?.dnaSystem;
    setValue("dnaSystem", dnaSystem);
    router.back();
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
