import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { Button } from "@/components/Button";
import { InputSelect, InputText } from "@/components/input";
import { Section } from "@/components/Section";
import { Spinner } from "@/components/Spinner";
import { SafeAreaView } from "@/components/themed";
import {
  LATENT_DEFAULTS,
  latentImpressionTypes,
  latentPositions,
} from "@/constants/latent";
import { buildLatentEbts } from "@/features/ebts/buildEbts";
import { makeThumbnail } from "@/features/ebts/saveEbts";
import { sendSubmission } from "@/features/ebts/sendSubmission";
import { DodSubmission, storeSubmission } from "@/features/ebts/vault";
import {
  getLatentPrint,
  removeLatentPrint,
} from "@/features/latent/latentStore";
import { tHelper } from "@/translations/translationHelper";
import { logEvent } from "@/util/fieldLog";
import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

type Field =
  | "impressionType"
  | "position"
  | "attentionIndicator"
  | "extension"
  | "caseIdPrefix"
  | "caseId";

const isAscii = (value: string) => /^[\x20-\x7e]*$/.test(value);

/**
 * The latent transaction form, like the Android app's latent_transaction.xml:
 * what the print is and the case it belongs to. Submitting builds an LFIS
 * transaction with the print as a Type-13, stores it encrypted and goes to
 * Submissions, as the other DoD transactions do.
 */
export default function LatentTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getValue } = useAutofill();
  const print = getLatentPrint(Number(id));

  const [impressionType, setImpressionType] = useState("");
  const [position, setPosition] = useState("");
  const [comment, setComment] = useState("");
  const [attentionIndicator, setAttentionIndicator] = useState(
    LATENT_DEFAULTS.attentionIndicator,
  );
  const [extension, setExtension] = useState(LATENT_DEFAULTS.extension);
  const [caseIdPrefix, setCaseIdPrefix] = useState(LATENT_DEFAULTS.caseIdPrefix);
  const [caseId, setCaseId] = useState(LATENT_DEFAULTS.caseId);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/latent");

  /** The Android form's checks. */
  const validate = () => {
    const found: Partial<Record<Field, string>> = {};
    const required = tHelper("valueRequired");
    if (!impressionType) found.impressionType = required;
    if (!position) found.position = required;
    if (!attentionIndicator.trim()) found.attentionIndicator = required;
    else if (attentionIndicator.trim().length < 3) {
      found.attentionIndicator = tHelper("mustBeThree");
    } else if (!isAscii(attentionIndicator)) {
      found.attentionIndicator = tHelper("asciiOnly");
    }
    if (!caseId.trim()) found.caseId = required;
    else if (!isAscii(caseId)) found.caseId = tHelper("asciiOnly");
    if (!caseIdPrefix.trim()) found.caseIdPrefix = required;
    else if (!isAscii(caseIdPrefix)) found.caseIdPrefix = tHelper("asciiOnly");
    if (!extension.trim()) found.extension = required;
    else if (extension.trim().length < 2) found.extension = tHelper("mustBeTwo");
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const submit = async () => {
    if (busy || !print || !validate()) return;
    setBusy(true);
    try {
      const file = buildLatentEbts({
        type1: getValue("type1Settings") ?? {},
        print,
        impressionType,
        position,
        comment: comment.trim(),
        attentionIndicator: attentionIndicator.trim(),
        caseIdPrefix: caseIdPrefix.trim(),
        caseId: caseId.trim(),
        extension: extension.trim(),
        appVersion: Constants.expoConfig?.version,
      });
      logEvent(
        "submit",
        `built LFIS: impression ${impressionType}, position ${position}, ${print.dpi} dpi`,
      );
      const stored: DodSubmission = {
        tcn: file.tcn,
        tot: "LFIS",
        name: tHelper("latentCardName").replace(
          "{case}",
          `${caseIdPrefix.trim()}-${caseId.trim()}`,
        ),
        createdAt: new Date().toISOString(),
        thumbnail: await makeThumbnail(print.pngBase64),
      };
      await storeSubmission(stored, file.bytes);
      void sendSubmission(stored);
      // In a transaction now: off the latent list, as on Android.
      removeLatentPrint(print.id);
      router.dismissAll();
      router.navigate("/submissions");
    } catch (e) {
      console.error("Latent transaction failed", e);
      Alert.alert(tHelper("latentCaptureError"), tHelper("latentTransError"));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={StyleSheet.absoluteFill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Section title={tHelper("latentSectionPrint")}>
            <InputSelect
              label={tHelper("impressionType")}
              required
              items={latentImpressionTypes}
              value={impressionType}
              error={errors.impressionType}
              countKey="latentImpressionType"
              onChange={setImpressionType}
            />
            <InputSelect
              label={tHelper("frgp")}
              required
              items={latentPositions}
              value={position}
              error={errors.position}
              countKey="latentPosition"
              onChange={setPosition}
            />
            <InputText
              label={tHelper("commentsOptional")}
              value={comment}
              maxLength={126}
              onChange={setComment}
            />
          </Section>
          <Section title={tHelper("caseLabel")}>
            <InputText
              label={tHelper("attentionIndicator")}
              required
              value={attentionIndicator}
              maxLength={30}
              autoCapitalize="characters"
              autoCorrect={false}
              error={errors.attentionIndicator}
              onChange={(v: string) => setAttentionIndicator(v.toUpperCase())}
            />
            <InputText
              label={tHelper("latentCaseExt")}
              required
              type="number"
              keyboardType="number-pad"
              value={extension}
              maxLength={4}
              error={errors.extension}
              onChange={setExtension}
            />
            <InputText
              label={tHelper("latentCaseIdPre")}
              required
              value={caseIdPrefix}
              maxLength={24}
              autoCorrect={false}
              error={errors.caseIdPrefix}
              onChange={setCaseIdPrefix}
            />
            <InputText
              label={tHelper("latentCaseId")}
              required
              value={caseId}
              maxLength={24}
              autoCorrect={false}
              error={errors.caseId}
              onChange={setCaseId}
            />
          </Section>
        </ScrollView>
        <View style={styles.bar}>
          <Button
            text={tHelper("back")}
            variant="secondary"
            style={styles.barButton}
            disabled={busy}
            onPress={goBack}
          />
          <Button
            text={tHelper("submitTransaction")}
            style={styles.barButton}
            disabled={busy || !print}
            onPress={submit}
          />
        </View>
      </KeyboardAvoidingView>
      {busy && <Spinner />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  form: { padding: 16, gap: 14 },
  bar: { flexDirection: "row", gap: 10, padding: 12 },
  barButton: { flex: 1, width: "auto", paddingHorizontal: 6 },
});
