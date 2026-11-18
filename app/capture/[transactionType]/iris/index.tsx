import { Button } from "@/components/Button";
import { useActiveDevice } from "@/components/device/activeDevice";
import { Col, Row } from "@/components/Structure";
import { H2, SafeAreaView, Text, View } from "@/components/themed";
import {
  useCaptureActions,
  useCaptureValue,
} from "@/features/capture/context/hooks";
import { mapIris } from "@/features/capture/context/util";
import { IrisCaptureIcon } from "@/features/capture/IrisCaptureIcon";
import {
  isIrisComplete,
  missingReason,
  supportsIrisCapture,
  upsertIrises,
} from "@/features/capture/util";
import { tHelper } from "@/translations/translationHelper";
import { Iris, IrisEyePosition } from "@/types";
import { hasMissingIrisReason } from "@/types/util";
import { useLocalSearchParams, useRouter } from "expo-router";
import DrawerToggle from "@/components/navigation/DrawerToggle";
import { StyleSheet } from "react-native";

const requiredEyes: IrisEyePosition[] = ["left", "right"];

export default function IrisReviewScreen() {
  const router = useRouter();
  const { transactionType } = useLocalSearchParams<{
    transactionType: string;
  }>();
  const { activeDevice } = useActiveDevice();
  const { setValue, getValue } = useCaptureActions();
  const persistedIrises = useCaptureValue<Iris[]>("transaction.irises");

  const configuredForIris = activeDevice?.connectionType === "wifi";
  const unsupportedModel =
    configuredForIris && !supportsIrisCapture(activeDevice?.modelNumber)
      ? activeDevice?.modelNumber
      : undefined;

  const localCompletion = isIrisComplete(persistedIrises);
  const hasCapturedImages = persistedIrises.some((iris) => Boolean(iris.image));

  const updateEyeSelection = (
    eyePosition: IrisEyePosition,
    omitted: boolean,
  ) => {
    const current = getValue<Iris[]>("transaction.irises");
    const retained = current.filter((iris) => iris.eyePosition !== eyePosition);

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
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <DrawerToggle />
          <H2>{tHelper("captureIris")}</H2>
          <Text style={styles.description}>{tHelper("captureIrisDesc")}</Text>
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

        <Row style={styles.eyeRow} gutter={2}>
          {requiredEyes.map((eyePosition) => {
            const iris = persistedIrises.find(
              (item) => item.eyePosition === eyePosition,
            );
            const omitted = hasMissingIrisReason(iris);

            return (
              <Col key={eyePosition}>
                <View style={styles.eyeColumn}>
                  <IrisCaptureIcon eyePosition={eyePosition} />
                  <Button
                    text={
                      omitted
                        ? tHelper("includeEye")
                        : `${tHelper("omit")} ${
                            eyePosition === "left"
                              ? tHelper("leftEye")
                              : tHelper("rightEye")
                          }`
                    }
                    style={styles.omitButton}
                    textStyle={styles.omitButtonText}
                    onPress={() => updateEyeSelection(eyePosition, !omitted)}
                  />
                </View>
              </Col>
            );
          })}
        </Row>

        <Text style={styles.helper}>{tHelper("irisReviewHint")}</Text>

        <Row gutter={2}>
          <Col>
            <Button
              text={tHelper(
                hasCapturedImages || localCompletion ? "retry" : "start",
              )}
              disabled={!configuredForIris || Boolean(unsupportedModel)}
              onPress={() =>
                router.navigate({
                  pathname: "/capture/[transactionType]/iris/capture",
                  params: { transactionType },
                })
              }
            />
          </Col>
          <Col>
            <Button
              text={localCompletion ? tHelper("done") : tHelper("cancel")}
              onPress={() => router.back()}
            />
          </Col>
        </Row>
      </View>
    </SafeAreaView>
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
  warning: {
    color: "#b42318",
    fontWeight: 600,
  },
  eyeRow: {
    alignItems: "flex-start",
    justifyContent: "space-evenly",
    flex: 1,
    paddingTop: 30,
  },
  eyeColumn: {
    alignItems: "center",
    gap: 12,
  },
  omitButton: {
    width: 160,
  },
  omitButtonText: {
    textAlign: "center",
  },
  helper: {
    textAlign: "center",
  },
});
