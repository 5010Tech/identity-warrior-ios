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

interface BiographicsFormProps {
  control: Control<BiographicData>;
}

export const BiographicsForm = ({ control }: BiographicsFormProps) => {
  return (
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
      <ControlledInput
        label={tHelper("reason")}
        control={control}
        name="collectionReason"
        component={InputText}
      />
    </>
  );
};
