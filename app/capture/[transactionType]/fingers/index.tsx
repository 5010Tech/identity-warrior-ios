import { Button } from "@/components/Button";
import { useActiveDevice } from "@/components/device/activeDevice";
import { ConnectionFailedDialog } from "@/components/device/ConnectionFailedDialog";
import { runSlapshotCapture } from "@/components/Slapshot/runSlapshotCapture";
import { useSlapshotContext } from "@/components/Slapshot/SlapshotContext";
import { Spinner } from "@/components/Spinner";
import { Col, Row } from "@/components/Structure";
import { SafeAreaView, View } from "@/components/themed";
import { tHelper } from "@/translations/translationHelper";
import { FGP } from "@/types/BiometricData";
import { useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, StyleSheet } from "react-native";
import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { fingerprintCaptureSequence } from "@/types";
import DrawerToggle from "@/components/navigation/DrawerToggle";
import { useCaptureActions } from "@/features/capture/context/hooks";
import { FingerCaptureIcon } from "@/features/capture/FingerCaptureIcon";
import { runBTCapture } from "@/features/capture/util";

export default function FingerprintCaptureScreen() {
  const router = useRouter();
  const { setValue } = useCaptureActions();
  const fingerprintCaptureSequence: fingerprintCaptureSequence =
    useAutofillSelector(
      (state) => state.appSettings.fingerprintCaptureSequence,
    );
  const [cameraPermission] = useCameraPermissions();
  const alertShown = useRef(false);

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && !alertShown.current) {
      alertShown.current = true;
      Alert.alert(tHelper("cameraPerm"), tHelper("allowCamera"), [
        {
          text: tHelper("openSettings"),
          onPress: async () => {
            const supported = await Linking.canOpenURL("app-settings:");
            if (supported) {
              await Linking.openURL("app-settings:");
            } else {
              console.warn("Unable to open app settings");
            }
          },
        },
        {
          text: tHelper("cancel"),
          style: "cancel",
          onPress: () => router.back(),
        },
      ]);
    }
  }, [cameraPermission, router]);

  const {
    connecting,
    activeDevice,
    connectToDevice,
    connectionFailed,
    closeConnectionFailedDialog,
  } = useActiveDevice();

  const capturingAt = useRef<{ fgp: FGP; i: number } | null>(null);
  const viewModel = useSlapshotContext();

  const [loadingMessage, setLoadingMessage] = useState("");

  if (!viewModel || !cameraPermission?.granted) return <Spinner />;

  const captureFingerprints = async (
    fgp?: FGP,
    fingerIndex?: number,
    retry?: boolean,
  ) => {
    if (fgp) {
      capturingAt.current = { fgp, i: fingerIndex ?? 0 };
    } else if (retry) {
      fgp = capturingAt.current?.fgp;
      fingerIndex = capturingAt.current?.i;
    } else {
      capturingAt.current = null;
    }
    connectionFailed && closeConnectionFailedDialog();
    if (activeDevice) {
      const connected = await connectToDevice();
      if (!connected) {
        return;
      }
      if (activeDevice.connectionType === "wifi") {
        router.navigate(
          fgp
            ? `/capture/[transactionType]/fingers/device?fgp=${fgp}`
            : "/capture/[transactionType]/fingers/device",
        );
      }
      if (activeDevice.connectionType === "bluetooth") {
        runBTCapture(
          setLoadingMessage,
          setValue,
          fgp,
          fingerIndex,
          fingerprintCaptureSequence,
        );
      }
    } else {
      await runSlapshotCapture(
        viewModel,
        setValue,
        fgp,
        fingerIndex,
        fingerprintCaptureSequence,
      );
    }
  };

  const handleFallback = async () => {
    connectionFailed && closeConnectionFailedDialog();
    const { fgp, i } = capturingAt.current ?? { fgp: undefined, i: undefined };
    capturingAt.current = null;
    await runSlapshotCapture(
      viewModel,
      setValue,
      fgp,
      i,
      fingerprintCaptureSequence,
    );
  };

  return (
    <>
      <SafeAreaView edges={["bottom", "top"]}>
        {connecting && <Spinner message={tHelper("connectingToDevice")} />}
        {loadingMessage && <Spinner message={loadingMessage} />}
        <View style={styles.container}>
          <DrawerToggle />
          {["tenFlat", "tenRolled"].includes(fingerprintCaptureSequence) ? (
            <>
              <Row>
                <FingerCaptureIcon
                  fingerPosition={2}
                  onPress={captureFingerprints}
                />
                <FingerCaptureIcon
                  fingerPosition={3}
                  onPress={captureFingerprints}
                />
              </Row>
              <Row>
                <FingerCaptureIcon
                  fingerPosition={4}
                  onPress={captureFingerprints}
                />
                <FingerCaptureIcon
                  fingerPosition={5}
                  onPress={captureFingerprints}
                />
              </Row>
              <Row>
                <FingerCaptureIcon
                  fingerPosition={7}
                  onPress={captureFingerprints}
                />
                <FingerCaptureIcon
                  fingerPosition={8}
                  onPress={captureFingerprints}
                />
              </Row>
              <Row>
                <FingerCaptureIcon
                  fingerPosition={9}
                  onPress={captureFingerprints}
                />
                <FingerCaptureIcon
                  fingerPosition={10}
                  onPress={captureFingerprints}
                />
              </Row>
              <Row>
                <FingerCaptureIcon
                  fingerPosition={1}
                  onPress={captureFingerprints}
                />
                <FingerCaptureIcon
                  fingerPosition={6}
                  onPress={captureFingerprints}
                />
              </Row>
            </>
          ) : (
            <Row>
              <FingerCaptureIcon
                fingerPosition={FGP.RIGHT_INDEX}
                onPress={captureFingerprints}
              />
              <FingerCaptureIcon
                fingerPosition={FGP.LEFT_INDEX}
                onPress={captureFingerprints}
              />
            </Row>
          )}
          <Row>
            <Col>
              <Button
                text={tHelper("start")}
                onPress={() => captureFingerprints()}
              />
            </Col>
            <Col>
              <Button text={tHelper("done")} onPress={router.back} />
            </Col>
          </Row>
        </View>
      </SafeAreaView>
      <ConnectionFailedDialog
        visible={connectionFailed}
        onRetry={captureFingerprints}
        onClose={closeConnectionFailedDialog}
        onFallback={handleFallback}
        deviceType={activeDevice?.connectionType}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    gap: 10,
    height: "100%",
    justifyContent: "space-between",
  },
});
