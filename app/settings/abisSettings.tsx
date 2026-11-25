import { DOD_DEFAULTS } from "@/constants/dodDefaults";
import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { Button } from "@/components/Button";
import { FormButtons } from "@/components/form";
import {
  ControlledInput,
  InputSelect,
  InputText,
  InputToggle,
} from "@/components/input";
import { Section } from "@/components/Section";
import { FormContainer } from "@/components/Structure";
import { SafeAreaView } from "@/components/themed";
import { tHelper } from "@/translations/translationHelper";
import { AbisSettings, AbisSystem } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { z } from "zod";

/** SecureStore keys for the secrets on this screen. */
export const NRTIO_PASSWORD_KEY = "nrtioPassword";
export const SFTP_PASSWORD_KEY = "sftpPassword";
export const BIOCORE_CREDENTIAL_KEY = "bioCoreCredential";

/** Same choices as the Android app's portal_array. */
const abisSystems: { value: AbisSystem; label: string }[] = [
  { value: "NONE", label: tHelper("abisNone") },
  { value: "NRTIO", label: "NRTIO" },
  { value: "SFTP", label: "SFTP" },
  { value: "BIOCORE", label: "BIOCORE" },
];

const port = z
  .string()
  .refine((v) => v === "" || (/^\d+$/.test(v) && +v >= 1 && +v <= 65535), {
    message: tHelper("invalidPort"),
  });

const formSchema = z.object({
  system: z.enum(["NONE", "NRTIO", "SFTP", "BIOCORE"]),
  nrtioHost: z.string().trim(),
  nrtioPort: port,
  nrtioAccount: z.string().trim(),
  nrtioPassword: z.string(),
  nrtioAllowSelfSigned: z.boolean(),
  sftpHost: z.string().trim(),
  sftpPort: port,
  sftpAccount: z.string().trim(),
  sftpPassword: z.string(),
  bioCoreHost: z.string().trim(),
  bioCorePort: port,
  bioCoreCredential: z.string(),
  bioCoreAllowSelfSigned: z.boolean(),
});

type AbisForm = z.infer<typeof formSchema>;

const emptyForm: AbisForm = {
  system: "NONE",
  nrtioHost: "",
  nrtioPort: "",
  nrtioAccount: "",
  nrtioPassword: "",
  nrtioAllowSelfSigned: false,
  sftpHost: "",
  sftpPort: "",
  sftpAccount: "",
  sftpPassword: "",
  bioCoreHost: DOD_DEFAULTS.bioCoreHost,
  bioCorePort: DOD_DEFAULTS.bioCorePort,
  bioCoreCredential: DOD_DEFAULTS.bioCoreCredential,
  bioCoreAllowSelfSigned: false,
};

const secrets = [
  ["nrtioPassword", NRTIO_PASSWORD_KEY],
  ["sftpPassword", SFTP_PASSWORD_KEY],
  ["bioCoreCredential", BIOCORE_CREDENTIAL_KEY],
] as const;

/** Settings saved by the first version of this screen (BioCore only). */
const fromSaved = (
  saved?: (Partial<AbisSettings> & { host?: string; port?: string }) | null,
) =>
  saved
    ? {
        ...saved,
        bioCoreHost: saved.bioCoreHost ?? saved.host ?? "",
        bioCorePort: saved.bioCorePort ?? saved.port ?? "443",
      }
    : {};

const hostProps = {
  autoCapitalize: "none",
  autoCorrect: false,
  keyboardType: "url",
} as const;

const accountProps = {
  autoCapitalize: "none",
  autoCorrect: false,
  keyboardType: "email-address",
} as const;

const secretProps = {
  secureTextEntry: true,
  autoCapitalize: "none",
  autoCorrect: false,
} as const;

/**
 * DoD ABIS connection details (DoD mode), like the Android app's
 * settings_abis.xml: pick the system, then fill in that system's connection.
 * Hosts, ports and account names are saved with the other settings; passwords
 * and the BioCore device credential are kept in SecureStore.
 */
export default function AbisSettingsScreen() {
  const router = useRouter();
  const { getValue, setValue } = useAutofill();
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue: setField,
  } = useForm<AbisForm>({
    defaultValues: { ...emptyForm, ...fromSaved(getValue("abisSettings")) },
    resolver: zodResolver(formSchema),
  });
  const system = watch("system");

  useEffect(() => {
    secrets.forEach(([field, key]) => {
      SecureStore.getItemAsync(key).then((secret) => {
        if (secret) setField(field, secret);
      });
    });
  }, [setField]);

  const onSubmit = async ({
    nrtioPassword,
    sftpPassword,
    bioCoreCredential,
    ...settings
  }: AbisForm) => {
    setValue("abisSettings", settings);
    const values = { nrtioPassword, sftpPassword, bioCoreCredential };
    await Promise.all(
      secrets.map(([field, key]) =>
        values[field]
          ? SecureStore.setItemAsync(key, values[field])
          : SecureStore.deleteItemAsync(key),
      ),
    );
    router.back();
  };

  const onClear = async () => {
    setValue("abisSettings", undefined);
    await Promise.all(
      secrets.map(([, key]) => SecureStore.deleteItemAsync(key)),
    );
    reset(emptyForm);
  };

  return (
    <SafeAreaView edges={["bottom"]} style={StyleSheet.absoluteFill}>
      <FormContainer style={styles.container}>
        <Section title={tHelper("sectionAbisSystem")}>
          <ControlledInput
            component={InputSelect}
            control={control}
            name={"system"}
            label={tHelper("chooseAbisSystem")}
            items={abisSystems}
            required
          />
        </Section>
        {system === "NRTIO" && (
          <Section title={tHelper("sectionNrtio")}>
            <ControlledInput
              component={InputText}
              control={control}
              name={"nrtioHost"}
              label={tHelper("portalHost")}
              {...hostProps}
            />
            <ControlledInput
              component={InputText}
              control={control}
              name={"nrtioPort"}
              label={tHelper("portalPort")}
              type="number"
            />
            <ControlledInput
              component={InputText}
              control={control}
              name={"nrtioAccount"}
              label={tHelper("portalAcct")}
              {...accountProps}
            />
            <ControlledInput
              component={InputText}
              control={control}
              name={"nrtioPassword"}
              label={tHelper("portalPass")}
              {...secretProps}
            />
            <ControlledInput
              component={InputToggle}
              control={control}
              name={"nrtioAllowSelfSigned"}
              label={tHelper("biocoreAllowSelfSigned")}
              hint={tHelper("nrtioAllowSelfSignedWarning")}
            />
          </Section>
        )}
        {system === "SFTP" && (
          <Section title={tHelper("sectionSftp")}>
            <ControlledInput
              component={InputText}
              control={control}
              name={"sftpHost"}
              label={tHelper("sftpHost")}
              {...hostProps}
            />
            <ControlledInput
              component={InputText}
              control={control}
              name={"sftpPort"}
              label={tHelper("sftpPort")}
              type="number"
            />
            <ControlledInput
              component={InputText}
              control={control}
              name={"sftpAccount"}
              label={tHelper("sftpAcct")}
              {...accountProps}
            />
            <ControlledInput
              component={InputText}
              control={control}
              name={"sftpPassword"}
              label={tHelper("sftpPass")}
              {...secretProps}
            />
          </Section>
        )}
        {system === "BIOCORE" && (
          <Section title={tHelper("sectionBioCoreServer")}>
            <ControlledInput
              component={InputText}
              control={control}
              name={"bioCoreHost"}
              label={tHelper("bioCoreHost")}
              {...hostProps}
            />
            <ControlledInput
              component={InputText}
              control={control}
              name={"bioCorePort"}
              label={tHelper("port")}
              type="number"
            />
            <ControlledInput
              component={InputText}
              control={control}
              name={"bioCoreCredential"}
              label={tHelper("deviceCredential")}
              {...secretProps}
            />
            <ControlledInput
              component={InputToggle}
              control={control}
              name={"bioCoreAllowSelfSigned"}
              label={tHelper("biocoreAllowSelfSigned")}
              hint={tHelper("biocoreAllowSelfSignedWarning")}
            />
          </Section>
        )}
        <View style={styles.actions}>
          <Button
            text={tHelper("clearSettings")}
            variant="destructive"
            icon="close"
            onPress={onClear}
          />
        </View>
      </FormContainer>
      <FormButtons
        onCancel={router.back}
        onSubmit={handleSubmit(onSubmit)}
        cancelText={tHelper("back")}
        submitText={tHelper("saveSettings")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8 },
  actions: { marginTop: 14 },
});
