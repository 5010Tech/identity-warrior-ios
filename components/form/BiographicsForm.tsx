import {
  sexOptions,
  eyeOptions,
  raceOptions,
  hairOptions,
  countryOptions,
} from "@/constants/SelectOptions";
import { Control } from "react-hook-form";
import { ControlledInput, InputText, InputSelect, InputDate } from "../input";
import { BiographicData } from "@/types";
import { tHelper } from "@/translations/translationHelper";
import { Section } from "../Section";
import { Fragment, PropsWithChildren } from "react";

interface BiographicsFormProps {
  control: Control<BiographicData>;
  /** Group the fields into titled cards, like the Type-2 settings screen. */
  sectioned?: boolean;
  /** Extra fields for the end of the Collection group. */
  children?: React.ReactNode;
}

export const BiographicsForm = ({
  control,
  sectioned,
  children,
}: BiographicsFormProps) => {
  const Group = ({ title, children }: PropsWithChildren<{ title: string }>) =>
    sectioned ? (
      <Section title={title}>{children}</Section>
    ) : (
      <Fragment>{children}</Fragment>
    );
  return (
    <>
      {Group({
        title: tHelper("sectionType2Name"),
        children: (
          <>
            <ControlledInput
              label={tHelper("givenName")}
              control={control}
              name="firstName"
              component={InputText}
            />
            <ControlledInput
              label={tHelper("middleName")}
              control={control}
              name="middleName"
              component={InputText}
            />
            <ControlledInput
              label={tHelper("surname")}
              control={control}
              name="lastName"
              component={InputText}
            />
            <ControlledInput
              label={tHelper("fourthName")}
              control={control}
              name="fourthName"
              component={InputText}
            />
            <ControlledInput
              label={tHelper("fifthName")}
              control={control}
              name="fifthName"
              component={InputText}
            />
          </>
        ),
      })}
      {Group({
        title: tHelper("sectionType2Physical"),
        children: (
          <>
            <ControlledInput
              label={tHelper("sex")}
              control={control}
              name="sex"
              component={InputSelect}
              items={sexOptions}
              required
            />
            <ControlledInput
              label={tHelper("height")}
              control={control}
              name="height"
              component={InputText}
              type="number"
            />
            <ControlledInput
              label={tHelper("weight")}
              control={control}
              name="weight"
              component={InputText}
              type="number"
            />
            <ControlledInput
              label={tHelper("eyeColor")}
              control={control}
              name="eyeColor"
              component={InputSelect}
              items={eyeOptions}
            />
            <ControlledInput
              label={tHelper("hairColor")}
              control={control}
              name="hairColor"
              component={InputSelect}
              items={hairOptions}
            />
            <ControlledInput
              label={tHelper("ethnicity")}
              control={control}
              name="race"
              component={InputSelect}
              items={raceOptions}
            />
          </>
        ),
      })}
      {Group({
        title: tHelper("sectionType2Birth"),
        children: (
          <>
            <ControlledInput
              label={tHelper("birthDate")}
              control={control}
              name={"dob"}
              component={InputDate}
            />
            <ControlledInput
              label={tHelper("birthCountry")}
              control={control}
              name="birthCountry"
              component={InputSelect}
              items={countryOptions}
            />
            <ControlledInput
              label={tHelper("citizenship")}
              control={control}
              name="citizenship"
              component={InputSelect}
              items={countryOptions}
            />
          </>
        ),
      })}
      {Group({
        title: tHelper("sectionType2Collection"),
        children: (
          <>
            <ControlledInput
              label={tHelper("reason")}
              control={control}
              name="collectionReason"
              component={InputText}
            />
            {children}
          </>
        ),
      })}
    </>
  );
};
