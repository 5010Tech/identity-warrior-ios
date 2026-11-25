import { resolveType1 } from "@/constants/dodDefaults";
import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { FormButtons } from "@/components/form";
import { ControlledInput, InputSelect, InputText } from "@/components/input";
import { Section } from "@/components/Section";
import { FormContainer } from "@/components/Structure";
import { SafeAreaView } from "@/components/themed";
import { ebtsVersions } from "@/constants/SelectOptions";
import { tHelper } from "@/translations/translationHelper";
import { Type1Settings } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React from "react";
import { useForm } from "react-hook-form";
import { StyleSheet } from "react-native";
import { z } from "zod";

const required = z
  .string()
  .trim()
  .min(1, { message: tHelper("valueRequired") });
const asciiName = required.refine((v) => /^[\x00-\x7F]*$/.test(v), {
  message: tHelper("asciiOnly"),
});

const formSchema = z.object({
  ori: required,
  oan: asciiName,
  dai: required,
  dan: asciiName,
  ebtsVersion: z.enum(["4.1", "NATO"], {
    errorMap: () => ({ message: tHelper("valueRequired") }),
  }),
});

const agencyIdProps = {
  autoCapitalize: "characters",
  autoCorrect: false,
  maxLength: 9,
} as const;

/**
 * DoD Type-1 transaction metadata, laid out like the Android app's
 * settings_type1.xml: Originating Agency, Destination Agency, Transaction.
 */
export default function Type1SettingsScreen() {
  const router = useRouter();
  const { getValue, setValue } = useAutofill();
  const { control, handleSubmit } = useForm({
    defaultValues: {
      // Pre-filled from the built-in defaults, as Android does from its
      // application.properties.
      ...resolveType1(getValue("type1Settings")),
    },
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: Type1Settings) => {
    setValue("type1Settings", data);
    router.back();
  };

  return (
    <SafeAreaView edges={["bottom"]} style={StyleSheet.absoluteFill}>
      <FormContainer style={styles.container}>
        <Section title={tHelper("sectionOriginatingAgency")}>
          <ControlledInput
            component={InputText}
            control={control}
            name={"ori"}
            label={tHelper("t1Ori")}
            {...agencyIdProps}
          />
          <ControlledInput
            component={InputText}
            control={control}
            name={"oan"}
            label={tHelper("t1Ora")}
          />
        </Section>
        <Section title={tHelper("sectionDestinationAgency")}>
          <ControlledInput
            component={InputText}
            control={control}
            name={"dai"}
            label={tHelper("t1Dai")}
            {...agencyIdProps}
          />
          <ControlledInput
            component={InputText}
            control={control}
            name={"dan"}
            label={tHelper("t1Dan")}
          />
        </Section>
        <Section title={tHelper("sectionType1Transaction")}>
          <ControlledInput
            component={InputSelect}
            control={control}
            name={"ebtsVersion"}
            label={tHelper("ebtsVersion")}
            items={ebtsVersions}
            required
          />
        </Section>
      </FormContainer>
      <FormButtons
        onCancel={router.back}
        onSubmit={handleSubmit((data) => onSubmit(data as Type1Settings))}
        cancelText={tHelper("back")}
        submitText={tHelper("saveSettings")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8 },
});
