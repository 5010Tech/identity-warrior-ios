import { Button } from "@/components/Button";
import { FormContainer } from "@/components/Structure";
import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { FormButtons } from "@/components/form";
import {
  ControlledInput,
  InputSelect,
  InputText,
  InputToggle,
} from "@/components/input";
import { Section } from "@/components/Section";
import { SafeAreaView, Text, useThemeColor } from "@/components/themed";
import {
  collectionModes,
  dodFingerCaptureModes,
  dodFingerSequences,
  fingerprintCaptureSequences,
  startingHands,
  trueFalseOptions,
} from "@/constants/SelectOptions";
import { tHelper } from "@/translations/translationHelper";
import { AppSettings } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { deleteItemAsync } from "expo-secure-store";
import { clearExportPasscode } from "@/features/ebts/exportPasscode";
import { wipeVault } from "@/features/ebts/vault";
import { exportLogs, logEvent } from "@/util/fieldLog";
import React from "react";
import { useForm } from "react-hook-form";
import { Alert, StyleSheet, View } from "react-native";
import { z } from "zod";

const formSchema = z.object({
  retainLogsDays: z.coerce
    .number({
      required_error: tHelper("oneDay"),
      invalid_type_error: tHelper("numReq"),
    })
    .int()
    .positive()
    .min(1, { message: tHelper("oneDay") }),
  retainSubmissionsDays: z.coerce
    .number({
      required_error: tHelper("oneDay"),
      invalid_type_error: tHelper("numReq"),
    })
    .int()
    .positive()
    .min(1, { message: tHelper("oneDay") }),
  retainExportsDays: z.coerce
    .number({
      required_error: tHelper("oneDay"),
      invalid_type_error: tHelper("numReq"),
    })
    .int()
    .positive()
    .min(1, { message: tHelper("oneDay") }),
  selfieMode: z.boolean().optional(),
  fingerprintCaptureSequence: z
    .string()
    .nonempty({ message: tHelper("reqField") }),
  darkMode: z.boolean().optional(),
  collectionMode: z.enum(["DOD", "DHS"]),
  dodFingerSequence: z.enum(["4-4-2", "4-1-4-1"]),
  dodFingerCaptureMode: z.enum(["manual", "automatic"]),
  allowContactlessPalm: z.boolean().optional(),
  startingHand: z.enum(["Left", "Right"]),
});

export default function AppSettingsScreen() {
  const router = useRouter();
  const { getValue, setValue } = useAutofill();
  const { control, handleSubmit, watch } = useForm({
    defaultValues: {
      collectionMode: "DOD" as const,
      darkMode: true,
      dodFingerSequence: "4-4-2" as const,
      dodFingerCaptureMode: "automatic" as const,
      startingHand: "Right" as const,
      retainExportsDays: 2,
      ...(getValue("appSettings") ?? {}),
    },
    resolver: zodResolver(formSchema),
  });
  // The settings below follow the mode picked at the top of the screen.
  const isDhs = watch("collectionMode") === "DHS";

  const onSubmit = (data: AppSettings) => {
    setValue("appSettings", data);
    router.back();
  };

  // Writes the field log to the Identity Warrior folder (Files app / Finder)
  // so it can be sent in when something goes wrong in the field.
  const onExportLogs = () => {
    exportLogs()
      .then((name) =>
        Alert.alert(
          tHelper("exportDone"),
          `${tHelper("exportLogsDone")}\n\n${name}`,
        ),
      )
      .catch((error) => Alert.alert(tHelper("exportFailed"), String(error)));
  };

  const onDeleteData = () => {
    Alert.alert(tHelper("clearData"), tHelper("clearProceed"), [
      {
        text: tHelper("cancel"),
        style: "cancel",
      },
      {
        text: tHelper("clearData"),
        style: "destructive",
        onPress: () => {
          deleteItemAsync("usernameOrEmail");
          deleteItemAsync("apiKey");
          deleteItemAsync("tokenType");
          deleteItemAsync("accessToken");
          deleteItemAsync("refreshToken");
          deleteItemAsync("baseUrl");
          // DoD: the ABIS passwords, every stored and exported transaction,
          // the encryption key, and the export passcode (asked for again).
          ["nrtioPassword", "sftpPassword", "bioCoreCredential"].forEach(
            (key) => deleteItemAsync(key),
          );
          wipeVault()
            .catch((error) => console.error("Could not clear the vault", error))
            .then(clearExportPasscode)
            .then(() => router.back())
            .catch(console.error);
        },
      },
    ]);
  };

  const hintColor = useThemeColor({}, "textMuted");

  const startCalibration = () => {
    router.push({
      pathname: "/settings/calibrationScreen",
    });
  };

  return (
    <SafeAreaView edges={["bottom"]} style={StyleSheet.absoluteFill}>
      <FormContainer style={styles.container}>
        <Section title={tHelper("sectionCollection")}>
          <ControlledInput
            component={InputSelect}
            control={control}
            name={"collectionMode"}
            label={tHelper("collectionMode")}
            items={collectionModes}
            required
          />
          <Text style={[styles.hint, { color: hintColor }]}>
            {tHelper("collectionModeHint")}
          </Text>
        </Section>
        <Section title={tHelper("sectionBiometricCapture")}>
          <ControlledInput
            component={InputToggle}
            control={control}
            name={"selfieMode"}
            label={tHelper("selfieMode")}
            hint={tHelper("selfieModeHint")}
          />
          {isDhs ? (
            <ControlledInput
              component={InputSelect}
              control={control}
              name={"fingerprintCaptureSequence"}
              label={tHelper("fingerprintCaptureSequence")}
              items={fingerprintCaptureSequences}
            />
          ) : (
            <>
              <ControlledInput
                component={InputToggle}
                control={control}
                name={"allowContactlessPalm"}
                label={tHelper("allowPalm")}
              />
              <ControlledInput
                component={InputSelect}
                control={control}
                name={"dodFingerSequence"}
                label={tHelper("fingerprintCaptureSequence")}
                items={dodFingerSequences}
                required
              />
              <ControlledInput
                component={InputSelect}
                control={control}
                name={"dodFingerCaptureMode"}
                label={tHelper("fingerprintCapture")}
                items={dodFingerCaptureModes}
                required
              />
            </>
          )}
          <ControlledInput
            component={InputSelect}
            control={control}
            name={"startingHand"}
            label={tHelper("startingHand")}
            items={startingHands}
            required
          />
        </Section>
        <Section title={tHelper("sectionDataRetention")}>
          <ControlledInput
            control={control}
            component={InputText}
            type="number"
            name={"retainLogsDays"}
            label={tHelper("numDaysLogs")}
          />
          <ControlledInput
            control={control}
            name={"retainSubmissionsDays"}
            component={InputText}
            type="number"
            label={tHelper("numDaysRetain")}
          />
          <ControlledInput
            control={control}
            name={"retainExportsDays"}
            component={InputText}
            type="number"
            label={tHelper("numDaysExports")}
          />
          <Text style={[styles.hint, { color: hintColor }]}>
            {tHelper("numDaysExportsHint")}
          </Text>
        </Section>
        <Section title={tHelper("sectionDisplay")}>
          <ControlledInput
            component={InputToggle}
            control={control}
            name={"darkMode"}
            label={tHelper("darkMode")}
            hint={tHelper("darkModeHint")}
          />
        </Section>
        <View style={styles.actions}>
          <Button
            text={tHelper("calibrate")}
            variant="secondary"
            onPress={startCalibration}
          />
          <Button
            text={tHelper("exportLogs")}
            icon="file-document-outline"
            variant="secondary"
            onPress={onExportLogs}
          />
          <Button
            text={tHelper("clearData")}
            variant="destructive"
            onPress={onDeleteData}
          />
        </View>
      </FormContainer>
      <FormButtons
        onCancel={router.back}
        onSubmit={handleSubmit(
          (data) => onSubmit(data as AppSettings),
          // A field that fails its check may be one this mode doesn't show, so
          // say that nothing was saved instead of doing nothing.
          (invalid) => {
            const fields = Object.keys(invalid).join(", ");
            logEvent("settings", `app settings not saved: ${fields}`);
            Alert.alert(tHelper("settingsNotSaved"), fields);
          },
        )}
        cancelText={tHelper("back")}
        submitText={tHelper("saveSettings")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  hint: {
    fontSize: 14,
  },
  actions: {
    gap: 10,
    marginTop: 14,
  },
});
