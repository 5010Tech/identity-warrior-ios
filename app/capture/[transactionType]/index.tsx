import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { Button } from "@/components/Button";
import { AppLogo100 } from "@/components/AppLogo";
import { Spinner } from "@/components/Spinner";
import { Col, Row } from "@/components/Structure";
import { H2, SafeAreaView, Text, View } from "@/components/themed";
import { BiographicData, Iris } from "@/types";
import { hasMissingIrisReason } from "@/types/util";
import { TransactionType } from "@/types/Transaction";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { tHelper } from "@/translations/translationHelper";
import { useSubmissionActions } from "@/components/submissions";
import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { CaptureStepButton } from "@/features/capture/CaptureStepButton";
import {
  useCaptureValue,
  useCaptureActions,
} from "@/features/capture/context/hooks";
import { CaptureState } from "@/features/capture/types";

const requiredIrisEyes = ["left", "right"] as const;

const isIrisCaptureComplete = (irises: Iris[]) =>
  requiredIrisEyes.every((eyePosition) => {
    const iris = irises.find((item) => item.eyePosition === eyePosition);
    return Boolean(iris?.image || hasMissingIrisReason(iris));
  });

export default function CaptureScreen() {
  const { transactionType } = useLocalSearchParams<{
    transactionType: TransactionType;
  }>();

  const router = useRouter();

  const {
    biographicsComplete,
    transaction,
    biographicsEnabled,
    faceEnabled,
    fingersEnabled,
    irisEnabled,
  } = useCaptureValue<CaptureState>();
  const { setEnabled } = useCaptureActions();
  const { getValue, createTCN } = useAutofill();
  const { addSubmission } = useSubmissionActions();
  const [fetching, setFetching] = useState(false);
  const fingerprintCaptureComplete: boolean = useAutofillSelector(
    (s) =>
      transaction.fingers.length >=
      (s.appSettings.fingerprintCaptureSequence === "tenFlat" ? 10 : 2),
  );

  const irisCaptureComplete = isIrisCaptureComplete(transaction.irises);

  const handleSubmit = async () => {
    try {
      setFetching(true);
      const submissionSettings = getValue("submissionSettings");

      if (!submissionSettings) throw new Error(tHelper("submissionSettingsErr"));

      const tcn = createTCN();
      const body = {
        ...transaction,
        ...submissionSettings,
        fingers: fingersEnabled ? transaction.fingers : [],
        irises: irisEnabled ? transaction.irises : [],
        biographicData: biographicsEnabled
          ? transaction.biographicData
          : ({
              firstName: "",
              lastName: "",
              dob: "",
              sex: "U",
              race: "",
              citizenship: "",
              birthCountry: "",
              eyeColor: "",
              collectionReason: "",
              hairColor: "",
              documents: [],
            } as BiographicData),
        tcn,
      };

      await addSubmission(body);
    } catch (error) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  const handleBack = () => {
    if (
      transaction.faces.length ||
      transaction.fingers.length ||
      transaction.irises.length ||
      Object.values(transaction.biographicData).some((v) => v?.length)
    ) {
      Alert.alert(tHelper("discardEntry"), tHelper("discardEntryMessage"), [
        { text: tHelper("cancel"), style: "cancel" },
        { text: tHelper("discard"), onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView>
      {fetching && <Spinner />}
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <AppLogo100 style={styles.iconStyle} />
          <H2>{transactionType} Request</H2>
          <Text style={styles.subHeading}>
            {tHelper("collectBio")}
            {"\n"}
            {tHelper("collectFaceFinger")}
            {"\n"}
            {tHelper("thenSubmit")}
          </Text>
        </View>
        <CaptureStepButton
          icon="vcard-o"
          path="/capture/[transactionType]/biographics"
          title={tHelper("bioData")}
          completed={!!biographicsComplete}
          enabled={biographicsEnabled}
          onEnabledChange={(enabled) =>
            setEnabled("biographicsEnabled", enabled)
          }
          canToggle={false}
        />
        <CaptureStepButton
          icon="user"
          path="/capture/[transactionType]/face"
          title={tHelper("captureFace")}
          completed={!!transaction.faces.length}
          enabled={faceEnabled}
          onEnabledChange={(enabled) => setEnabled("faceEnabled", enabled)}
          canToggle={["Identify", "Verify"].includes(transactionType)}
        />
        <CaptureStepButton
          icon="fingerprint"
          path="/capture/[transactionType]/fingers"
          title={tHelper("captureFinger")}
          completed={fingerprintCaptureComplete}
          enabled={fingersEnabled}
          onEnabledChange={(enabled) => setEnabled("fingersEnabled", enabled)}
          canToggle={["Identify", "Verify"].includes(transactionType)}
        />
        <CaptureStepButton
          icon="eye"
          path="/capture/[transactionType]/iris"
          title={tHelper("captureIris")}
          completed={irisCaptureComplete}
          enabled={irisEnabled}
          onEnabledChange={(enabled) => setEnabled("irisEnabled", enabled)}
          canToggle
        />
        <Row>
          <Col>
            <Button onPress={handleBack} text={tHelper("cancel")} />
          </Col>
          <Col>
            <Button
              text={tHelper("submitRequest")}
              onPress={handleSubmit}
              disabled={
                (fingersEnabled && !fingerprintCaptureComplete) ||
                (faceEnabled && !transaction.faces.length) ||
                (biographicsEnabled && !biographicsComplete) ||
                (irisEnabled && !irisCaptureComplete)
              }
            />
          </Col>
        </Row>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "space-evenly",
    height: "100%",
    paddingHorizontal: 10,
  },
  titleContainer: {
    alignItems: "center",
  },
  subHeading: {
    textAlign: "center",
  },
  iconStyle: {
    height: 75,
    width: 75,
  },
});
