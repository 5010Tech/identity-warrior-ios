import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { FormButtons } from "@/components/form";
import {
  ControlledInput,
  InputDate,
  InputSelect,
  InputText,
} from "@/components/input";
import { Section } from "@/components/Section";
import { Col, FormContainer, Row } from "@/components/Structure";
import { SafeAreaView } from "@/components/themed";
import {
  countryOptions,
  dodRaceOptions,
  dodSexOptions,
  eyeOptions,
  hairOptions,
  personnelTypes,
} from "@/constants/SelectOptions";
import { tHelper } from "@/translations/translationHelper";
import { Type2Settings } from "@/types";
import { useRouter } from "expo-router";
import React from "react";
import { useForm } from "react-hook-form";
import { StyleSheet } from "react-native";

type Type2Form = Omit<Type2Settings, "dob"> & { dob?: Date | null };

const emptyForm: Type2Form = {
  givenName: "",
  surname: "",
  sex: "",
  height: "",
  weight: "",
  eyeColor: "",
  hairColor: "",
  race: "",
  dob: null,
  birthCountry: "",
  citizenship: "",
  personnelType: "",
  collectionReason: "",
  dnaSystem: "",
};

const today = new Date();

/**
 * DoD Type-2 default biographic and demographic values, laid out like the
 * Android app's settings_type2.xml: Name, Physical Description,
 * Birth & Citizenship, Collection. Every field is optional.
 */
export default function Type2SettingsScreen() {
  const router = useRouter();
  const { getValue, setValue } = useAutofill();
  const saved = getValue("type2Settings");
  const { control, handleSubmit } = useForm<Type2Form>({
    defaultValues: {
      ...emptyForm,
      ...(saved ?? {}),
      dob: saved?.dob ? new Date(saved.dob) : null,
    },
  });

  const onSubmit = ({ dob, ...data }: Type2Form) => {
    setValue("type2Settings", { ...data, dob: dob ? dob.toISOString() : null });
    router.back();
  };

  return (
    <SafeAreaView edges={["bottom"]} style={StyleSheet.absoluteFill}>
      <FormContainer style={styles.container}>
        <Section title={tHelper("sectionType2Name")}>
          <ControlledInput
            component={InputText}
            control={control}
            name={"givenName"}
            label={tHelper("givenName")}
            autoCapitalize="words"
            maxLength={50}
          />
          <ControlledInput
            component={InputText}
            control={control}
            name={"surname"}
            label={tHelper("surname")}
            autoCapitalize="words"
            maxLength={50}
          />
        </Section>
        <Section title={tHelper("sectionType2Physical")}>
          <ControlledInput
            component={InputSelect}
            control={control}
            name={"sex"}
            label={tHelper("t2Sex")}
            items={dodSexOptions}
          />
          <Row gutter={2.4}>
            <Col>
              <ControlledInput
                component={InputText}
                control={control}
                name={"height"}
                label={tHelper("height")}
                type="number"
                maxLength={2}
              />
            </Col>
            <Col>
              <ControlledInput
                component={InputText}
                control={control}
                name={"weight"}
                label={tHelper("weight")}
                type="number"
                maxLength={3}
              />
            </Col>
          </Row>
          <ControlledInput
            component={InputSelect}
            control={control}
            name={"eyeColor"}
            label={tHelper("eyeColor")}
            items={eyeOptions}
          />
          <ControlledInput
            component={InputSelect}
            control={control}
            name={"hairColor"}
            label={tHelper("hairColor")}
            items={hairOptions}
          />
          <ControlledInput
            component={InputSelect}
            control={control}
            name={"race"}
            label={tHelper("ethnicity")}
            items={dodRaceOptions}
          />
        </Section>
        <Section title={tHelper("sectionType2Birth")}>
          <ControlledInput
            component={InputDate}
            control={control}
            name={"dob"}
            label={tHelper("t2BirthDate")}
            max={today}
            placeholder={tHelper("clickToSet")}
          />
          <ControlledInput
            component={InputSelect}
            control={control}
            name={"birthCountry"}
            label={tHelper("birthCountry")}
            items={countryOptions}
          />
          <ControlledInput
            component={InputSelect}
            control={control}
            name={"citizenship"}
            label={tHelper("citizenship")}
            items={countryOptions}
          />
        </Section>
        <Section title={tHelper("sectionType2Collection")}>
          <ControlledInput
            component={InputSelect}
            control={control}
            name={"personnelType"}
            label={tHelper("personnelType")}
            items={personnelTypes}
          />
          <ControlledInput
            component={InputText}
            control={control}
            name={"collectionReason"}
            label={tHelper("reason")}
            multiline
            autoCapitalize="sentences"
          />
          <ControlledInput
            component={InputText}
            control={control}
            name={"dnaSystem"}
            label={tHelper("dnaSystemName")}
          />
        </Section>
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
});
