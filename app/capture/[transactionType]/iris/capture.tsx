import { Button } from "@/components/Button";
import { useActiveDevice } from "@/components/device/activeDevice";
import { ConnectionFailedDialog } from "@/components/device/ConnectionFailedDialog";
import { Spinner } from "@/components/Spinner";
import { Col, Row } from "@/components/Structure";
import { H2, SafeAreaView, Text, View } from "@/components/themed";
import {
  useCaptureActions,
  useCaptureValue,
} from "@/features/capture/context/hooks";
import { mapIris } from "@/features/capture/context/util";
import {
  missingReason,
  requiredEyes,
  supportsIrisCapture,
  upsertIrises,
} from "@/features/capture/util";
import { ExpoIdentifi, ExpoIdentifiView } from "@/modules/expo-identifi";
import ExpoIdentifiModule, {
  IrisCaptureResult,
  IrisCaptureStatusEvent,
} from "@/modules/expo-identifi/src/ExpoIdentifiModule";
import { tHelper } from "@/translations/translationHelper";
import { Iris, IrisEyePosition } from "@/types";
import { hasMissingIrisReason } from "@/types/util";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DrawerToggle from "@/components/navigation/DrawerToggle";
import { Alert, StyleSheet } from "react-native";

const getOmittedEyes = (irises: Iris[]) => ({
  left: hasMissingIrisReason(
    irises.find((iris) => iris.eyePosition === "left"),
  ),
  right: hasMissingIrisReason(
    irises.find((iris) => iris.eyePosition === "right"),
  ),
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function IrisCaptureScreen() {
  const router = useRouter();
  const { setValue, getValue } = useCaptureActions();
  const persistedIrises = useCaptureValue<Iris[]>("transaction.irises");
  const {
    activeDevice,
    connecting,
    connectToDevice,
    disconnectFromDevice,
    connectionFailed,
    closeConnectionFailedDialog,
  } = useActiveDevice();

  const [loadingMessage, setLoadingMessage] = useState("");
  const [captureStatusDescription, setCaptureStatusDescription] = useState(
    tHelper("irisCaptureScreenDesc"),
  );
  const [captureRunning, setCaptureRunning] = useState(false);
  const [unsupportedModel, setUnsupportedModel] = useState<string>();
  const [hasReceivedPreviewFrame, setHasReceivedPreviewFrame] = useState(false);

  const mounted = useRef(true);
  const captureRunningRef = useRef(false);
  const suppressCancelAlert = useRef(false);
  const attemptedAutoStart = useRef(false);
  const hasReceivedPreviewFrameRef = useRef(false);

  const configuredForIris = activeDevice?.connectionType === "wifi";
  const omittedEyes = useMemo(
    () => getOmittedEyes(persistedIrises),
    [persistedIrises],
  );
  const bothEyesOmitted = omittedEyes.left && omittedEyes.right;

  useEffect(() => {
    captureRunningRef.current = captureRunning;
  }, [captureRunning]);

  useEffect(() => {
    hasReceivedPreviewFrameRef.current = hasReceivedPreviewFrame;
  }, [hasReceivedPreviewFrame]);

  const waitForCaptureToSettle = useCallback(async () => {
    for (let i = 0; i < 100 && captureRunningRef.current; i += 1) {
      await wait(50);
    }
  }, []);

  const persistEyeSelection = useCallback(
    (eyePosition: IrisEyePosition, omitted: boolean) => {
      const current = getValue<Iris[]>("transaction.irises");
      const retained = current.filter(
        (iris) => iris.eyePosition !== eyePosition,
      );

      if (!omitted) {
        setValue("transaction.irises", retained);
        return;
      }

      setValue(
        "transaction.irises",
        upsertIrises(retained, [
          mapIris({
            eyePosition,
            make: "IdentiFI",
            modelNumber: activeDevice?.modelNumber ?? "UNKNOWN",
            serialNumber: activeDevice?.serialNumber ?? "UNKNOWN",
            missingReason,
          }),
        ]),
      );
    },
    [activeDevice?.modelNumber, activeDevice?.serialNumber, getValue, setValue],
  );

  const buildIrisPayload = useCallback(
    (
      modelNumber: string,
      serialNumber: string,
      result: IrisCaptureResult,
      omitted: Record<IrisEyePosition, boolean>,
    ) =>
      requiredEyes.map((eyePosition) => {
        if (omitted[eyePosition]) {
          return mapIris({
            eyePosition,
            make: "IdentiFI",
            modelNumber,
            serialNumber,
            missingReason,
          });
        }

        const isLeft = eyePosition === "left";
        return mapIris({
          eyePosition,
          image: isLeft ? result.leftImage : result.rightImage,
          imageHeight: result.imageHeight ?? 480,
          imageWidth: result.imageWidth ?? 640,
          totalScore: isLeft ? result.leftTotalScore : result.rightTotalScore,
          usableArea: isLeft ? result.leftUsableArea : result.rightUsableArea,
          horizontalPixelDensity: result.horizontalPixelDensity ?? 0,
          verticalPixelDensity: result.verticalPixelDensity ?? 0,
          imageBitsPerPixelQuantity: result.imageBitsPerPixelQuantity ?? 8,
          make: "IdentiFI",
          modelNumber,
          serialNumber,
        });
      }),
    [],
  );

  const finalizeCapture = useCallback(
    async (result: IrisCaptureResult) => {
      let modelNumber = activeDevice?.modelNumber ?? "UNKNOWN";
      let serialNumber = activeDevice?.serialNumber ?? "UNKNOWN";

      try {
        const deviceInfo = await ExpoIdentifiModule.getDeviceInfo();
        modelNumber = deviceInfo.modelNumber || modelNumber;
        serialNumber = deviceInfo.serialNumber || serialNumber;
      } catch (error) {
        console.warn("Falling back to placeholder iris device metadata", error);
      }

      const current = getValue<Iris[]>("transaction.irises");
      const next = upsertIrises(
        current,
        buildIrisPayload(
          modelNumber,
          serialNumber,
          result,
          getOmittedEyes(current),
        ),
      );

      setValue("transaction.irises", next);
      setLoadingMessage("");
      setCaptureRunning(false);

      await wait(1200);
      if (mounted.current) {
        router.back();
      }
    },
    [
      activeDevice?.modelNumber,
      activeDevice?.serialNumber,
      buildIrisPayload,
      getValue,
      router,
      setValue,
    ],
  );

  const handleIrisCaptureStatus = useCallback(
    ({ irisCaptureStatus }: IrisCaptureStatusEvent) => {
      console.log("Iris capture status:", irisCaptureStatus);
      switch (irisCaptureStatus) {
        case 1:
          setLoadingMessage("");
          setHasReceivedPreviewFrame(true);
          setCaptureStatusDescription(tHelper("irisCaptureScreenDesc"));
          break;
        case 2:
          setLoadingMessage("");
          setHasReceivedPreviewFrame(true);
          setCaptureStatusDescription(tHelper("irisEyesDetectedKeepMoving"));
          break;
        case 3:
          setCaptureStatusDescription(tHelper("processing"));
          break;
        case 5:
          setLoadingMessage("");
          setCaptureStatusDescription(tHelper("irisCaptureScreenDesc"));
          break;
        default:
          break;
      }
    },
    [],
  );

  useEffect(() => {
    const subscription = ExpoIdentifiModule.addIrisCaptureStatusListener(
      handleIrisCaptureStatus,
    );

    return () => {
      subscription.remove();
    };
  }, [handleIrisCaptureStatus]);

  useEffect(() => {
    const subscription = ExpoIdentifiModule.addIrisPreviewFrameListener(() => {
      setHasReceivedPreviewFrame(true);
      setLoadingMessage("");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleUnsupportedModel = useCallback(
    (modelNumber: string) => {
      setUnsupportedModel(modelNumber);
      Alert.alert(tHelper("captureIris"), tHelper("irisUnsupportedDevice"), [
        {
          text: tHelper("close"),
          style: "cancel",
          onPress: () => router.back(),
        },
      ]);
    },
    [router],
  );

  const startCapture = useCallback(async () => {
    const currentOmissions = getOmittedEyes(
      getValue<Iris[]>("transaction.irises"),
    );
    if (
      captureRunningRef.current ||
      !configuredForIris ||
      (currentOmissions.left && currentOmissions.right)
    ) {
      return;
    }

    setCaptureRunning(true);
    setHasReceivedPreviewFrame(false);
    setLoadingMessage(tHelper("connectingToDevice"));
    setCaptureStatusDescription(tHelper("irisCaptureScreenDesc"));
    setUnsupportedModel(undefined);
    closeConnectionFailedDialog();

    try {
      const connected = await connectToDevice();
      if (!connected || !mounted.current) {
        return;
      }

      const { modelNumber } = await ExpoIdentifiModule.getDeviceInfo();
      if (!supportsIrisCapture(modelNumber)) {
        handleUnsupportedModel(modelNumber);
        return;
      }

      setLoadingMessage(tHelper("startingIrisCapture"));
      const result = await ExpoIdentifi.startIrisCapture();
      if (!mounted.current) {
        return;
      }

      setLoadingMessage(tHelper("processing"));
      await finalizeCapture(result);
    } catch (error) {
      if (!mounted.current) {
        return;
      }

      console.error("Error capturing irises", error);
      const isCancelled =
        error instanceof Error &&
        error.message.toLowerCase().includes("cancel");

      if (isCancelled && suppressCancelAlert.current) {
        suppressCancelAlert.current = false;
        return;
      }

      Alert.alert(
        tHelper("error"),
        isCancelled
          ? tHelper("captureCancelled")
          : tHelper("failedToCaptureIris"),
        [
          {
            text: tHelper("retry"),
            onPress: () => {
              attemptedAutoStart.current = true;
              void startCapture();
            },
          },
          {
            text: tHelper("close"),
            style: "cancel",
            onPress: () => {
              router.back();
            },
          },
        ],
      );
    } finally {
      if (mounted.current) {
        setCaptureRunning(false);
        setLoadingMessage("");
        if (!hasReceivedPreviewFrameRef.current) {
          setCaptureStatusDescription(tHelper("irisCaptureScreenDesc"));
        }
      }
    }
  }, [
    closeConnectionFailedDialog,
    configuredForIris,
    connectToDevice,
    finalizeCapture,
    getValue,
    handleUnsupportedModel,
    router,
  ]);

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      attemptedAutoStart.current = false;

      if (configuredForIris && !bothEyesOmitted) {
        attemptedAutoStart.current = true;
        void startCapture();
      }

      const endCapture = async () => {
        await ExpoIdentifi.cancelIrisCapture().catch(() => undefined);
        await ExpoIdentifi.setIrisPowerOff().catch(() => undefined);
        await disconnectFromDevice().catch(() => undefined);
      };

      return () => {
        mounted.current = false;
        void endCapture();
        setHasReceivedPreviewFrame(false);
        setLoadingMessage("");
        setCaptureStatusDescription(tHelper("irisCaptureScreenDesc"));
        setCaptureRunning(false);
      };
    }, [
      bothEyesOmitted,
      configuredForIris,
      disconnectFromDevice,
      startCapture,
    ]),
  );

  const handleToggleOmit = useCallback(
    async (eyePosition: IrisEyePosition) => {
      const current = getValue<Iris[]>("transaction.irises");
      const currentlyOmitted = hasMissingIrisReason(
        current.find((iris) => iris.eyePosition === eyePosition),
      );

      if (captureRunningRef.current) {
        try {
          suppressCancelAlert.current = true;
          await ExpoIdentifi.cancelIrisCapture();
        } catch (error) {
          suppressCancelAlert.current = false;
          console.warn("Failed to cancel iris capture", error);
        }
        await waitForCaptureToSettle();
      }

      persistEyeSelection(eyePosition, !currentlyOmitted);

      const next = getOmittedEyes(getValue<Iris[]>("transaction.irises"));
      if (configuredForIris && !(next.left && next.right) && mounted.current) {
        attemptedAutoStart.current = true;
        void startCapture();
      }
    },
    [
      configuredForIris,
      getValue,
      persistEyeSelection,
      startCapture,
      waitForCaptureToSettle,
    ],
  );

  return (
    <>
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        {(connecting || loadingMessage) && (
          <Spinner message={loadingMessage || tHelper("connectingToDevice")} />
        )}
        <View style={styles.container}>
          <View style={styles.header}>
            <H2>{tHelper("captureIris")}</H2>
            <Text style={styles.description}>{captureStatusDescription}</Text>
            {!configuredForIris && (
              <Text style={styles.warning}>
                {tHelper("selectIdentifiDevice")}
              </Text>
            )}
            {!!unsupportedModel && (
              <Text style={styles.warning}>
                {tHelper("irisUnsupportedDevice")}: {unsupportedModel}
              </Text>
            )}
          </View>
          <Row style={styles.previewRow} gutter={2}>
            {requiredEyes.map((eyePosition) => {
              const stored = persistedIrises.find(
                (iris) => iris.eyePosition === eyePosition,
              );
              const isOmitted = hasMissingIrisReason(stored);
              const hasCapture = Boolean(stored?.image) && !isOmitted;

              return (
                <Col key={eyePosition}>
                  <View style={styles.eyeCard}>
                    <Text style={styles.eyeTitle}>
                      {eyePosition === "left"
                        ? tHelper("leftEye")
                        : tHelper("rightEye")}
                    </Text>
                    <ExpoIdentifiView
                      streamType={
                        eyePosition === "left" ? "irisLeft" : "irisRight"
                      }
                      style={styles.eyePreview}
                    />
                    <Text style={styles.eyeStatus}>
                      {isOmitted
                        ? tHelper("missing")
                        : hasCapture
                          ? tHelper("captured")
                          : tHelper("capturePending")}
                    </Text>
                    <Button
                      text={
                        isOmitted
                          ? tHelper("includeEye")
                          : `${tHelper("omit")} ${
                              eyePosition === "left"
                                ? tHelper("leftEye")
                                : tHelper("rightEye")
                            }`
                      }
                      onPress={() => void handleToggleOmit(eyePosition)}
                    />
                  </View>
                </Col>
              );
            })}
          </Row>
          <Text style={styles.helper}>{tHelper("irisCaptureHint")}</Text>
          <Row gutter={2}>
            <Col>
              <Button
                text={tHelper(captureRunning ? "retry" : "start")}
                onPress={() => {
                  attemptedAutoStart.current = true;
                  void startCapture();
                }}
                disabled={
                  !configuredForIris ||
                  Boolean(unsupportedModel) ||
                  bothEyesOmitted
                }
              />
            </Col>
            <Col>
              <Button text={tHelper("done")} onPress={() => router.back()} />
            </Col>
          </Row>
        </View>
      </SafeAreaView>
      <ConnectionFailedDialog
        visible={connectionFailed}
        onRetry={() => {
          attemptedAutoStart.current = true;
          void startCapture();
        }}
        onClose={closeConnectionFailedDialog}
        deviceType={activeDevice?.connectionType}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  header: {
    gap: 8,
  },
  description: {
    fontSize: 16,
  },
  previewRow: {
    alignItems: "stretch",
    flex: 1,
  },
  eyeCard: {
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 8,
    gap: 10,
    height: "100%",
    padding: 10,
  },
  eyeTitle: {
    fontSize: 18,
    fontWeight: 600,
    textAlign: "center",
  },
  eyePreview: {
    flex: 1,
    minHeight: 220,
    width: "100%",
    backgroundColor: "#f8f8f8",
    borderRadius: 4,
    overflow: "hidden",
  },
  eyeStatus: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: 500,
  },
  warning: {
    color: "#b42318",
    fontWeight: 600,
  },
  helper: {
    textAlign: "center",
  },
});
