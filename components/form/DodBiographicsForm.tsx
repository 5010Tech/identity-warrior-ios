import {
  countryOptions,
  dodRaceOptions,
  dodSexOptions,
  eyeOptions,
  hairOptions,
  personnelTypes,
} from "@/constants/SelectOptions";
import { tHelper } from "@/translations/translationHelper";
import { BiographicData } from "@/types";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { Control, useWatch } from "react-hook-form";
import { Pressable, StyleSheet, View } from "react-native";
import { useThemeColor } from "../themed";
import { ControlledInput, InputDate, InputSelect, InputText } from "../input";
import { Section } from "../Section";
import { Col, Row } from "../Structure";

interface DodBiographicsFormProps {
  control: Control<BiographicData>;
  /** DoD transaction: "car" (Criminal Applicant) shows the Arrest section. */
  dodTot?: string;
}

const today = new Date();
const nameProps = { autoCapitalize: "words", maxLength: 50 } as const;

/**
 * DoD biographic (Type-2) entry, laid out like the Android app's type2.xml:
 * Name, Physical Description, Birth & Citizenship, Collection and, for a
 * Criminal Applicant, Arrest.
 */
export const DodBiographicsForm = ({
  control,
  dodTot,
}: DodBiographicsFormProps) => {
  const isCar = dodTot === "car";
  // Like Android: DNA System Name only appears once a DNA identifier is entered.
  const dnaId = useWatch({ control, name: "dnaId" });
  const router = useRouter();
  const { transactionType } = useGlobalSearchParams<{
    transactionType: string;
  }>();
  const scanBg = useThemeColor({}, "button");
  const scanIcon = useThemeColor({}, "buttonText");
  const scanDna = () =>
    router.push({
      pathname: "/capture/[transactionType]/biographics/barcode_scan",
      params: { transactionType },
    });

  return (
    <>
      <Section title={tHelper("sectionType2Name")}>
        <ControlledInput
          component={InputText}
          control={control}
          name="firstName"
          label={tHelper("givenName")}
          {...nameProps}
        />
        <ControlledInput
          component={InputText}
          control={control}
          name="middleName"
          label={tHelper("t2MiddleName")}
          {...nameProps}
        />
        <ControlledInput
          component={InputText}
          control={control}
          name="lastName"
          label={tHelper("surname")}
          {...nameProps}
        />
        <ControlledInput
          component={InputText}
          control={control}
          name="fourthName"
          label={tHelper("t2FourthName")}
          {...nameProps}
        />
        <ControlledInput
          component={InputText}
          control={control}
          name="fifthName"
          label={tHelper("t2FifthName")}
          {...nameProps}
        />
      </Section>

      <Section title={tHelper("sectionType2Physical")}>
        <ControlledInput
          component={InputSelect}
          control={control}
          name="sex"
          label={tHelper("t2Sex")}
          items={dodSexOptions}
        />
        <Row gutter={2.4}>
          <Col>
            <ControlledInput
              component={InputText}
              control={control}
              name="height"
              label={tHelper("height")}
              type="number"
              maxLength={2}
            />
          </Col>
          <Col>
            <ControlledInput
              component={InputText}
              control={control}
              name="weight"
              label={tHelper("weight")}
              type="number"
              maxLength={3}
            />
          </Col>
        </Row>
        <ControlledInput
          component={InputSelect}
          control={control}
          name="eyeColor"
          label={tHelper("eyeColor")}
          items={eyeOptions}
        />
        <ControlledInput
          component={InputSelect}
          control={control}
          name="hairColor"
          label={tHelper("hairColor")}
          items={hairOptions}
        />
        <ControlledInput
          component={InputSelect}
          control={control}
          name="race"
          label={tHelper("ethnicity")}
          items={dodRaceOptions}
        />
      </Section>

      <Section title={tHelper("sectionType2Birth")}>
        <ControlledInput
          component={InputDate}
          control={control}
          name="dob"
          label={tHelper("t2BirthDate")}
          max={today}
          placeholder={tHelper("clickToSet")}
        />
        <ControlledInput
          component={InputSelect}
          control={control}
          name="birthCountry"
          label={tHelper("birthCountry")}
          items={countryOptions}
        />
        <ControlledInput
          component={InputSelect}
          control={control}
          name="citizenship"
          label={tHelper("citizenship")}
          items={countryOptions}
        />
      </Section>

      <Section title={tHelper("sectionType2Collection")}>
        <ControlledInput
          component={InputSelect}
          control={control}
          name="personnelType"
          label={tHelper("personnelType")}
          items={personnelTypes}
        />
        <View style={styles.dnaRow}>
          <View style={styles.dnaField}>
            <ControlledInput
              component={InputText}
              control={control}
              name="dnaId"
              label={tHelper("dnaIdentifier")}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={512}
            />
          </View>
          <Pressable
            onPress={scanDna}
            style={[styles.scan, { backgroundColor: scanBg }]}
            accessibilityRole="button"
            accessibilityLabel={tHelper("scanBarcode")}
            hitSlop={6}
          >
            <MaterialCommunityIcons
              name="barcode-scan"
              size={28}
              color={scanIcon}
            />
          </Pressable>
        </View>
        {dnaId ? (
          <ControlledInput
            component={InputText}
            control={control}
            name="dnaSystem"
            label={tHelper("dnaSystemName")}
            autoCapitalize="sentences"
            maxLength={255}
          />
        ) : null}
        {!isCar && (
          <ControlledInput
            component={InputText}
            control={control}
            name="collectionReason"
            label={tHelper("reason")}
            multiline
            autoCapitalize="sentences"
            maxLength={300}
          />
        )}
      </Section>

      {isCar && (
        <Section title={tHelper("sectionType2Arrest")}>
          <ControlledInput
            component={InputText}
            control={control}
            name="internment"
            label={tHelper("internment")}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={16}
          />
          <ControlledInput
            component={InputDate}
            control={control}
            name="arrestDate"
            label={tHelper("arrestDate")}
            max={today}
            placeholder={tHelper("clickToSet")}
          />
          <ControlledInput
            component={InputText}
            control={control}
            name="arrestOffense"
            label={tHelper("arrestOffense")}
            autoCapitalize="sentences"
            maxLength={300}
          />
        </Section>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // The scan button lines up with the text box, under the field's label.
  dnaRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  dnaField: { flex: 1 },
  scan: {
    width: 54,
    height: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
