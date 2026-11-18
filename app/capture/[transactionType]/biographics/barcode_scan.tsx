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
    setValue("dnaId", data);
    const autofillValues = getValue("biographics");
    setValue("dnaSystem", autofillValues?.dnaSystem);
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
          onBarcodeScanned={handleBarCodeScanned}
        />
      )}
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
