import { identifyingNumberTypes } from "@/constants/SelectOptions";
import { BiographicData } from "@/types";
import { Control } from "react-hook-form";
import { StyleSheet } from "react-native";
import { ControlledInput, InputSelect, InputText } from "../input";
import { H2, useThemeColor, View } from "../themed";
import { tHelper } from "@/translations/translationHelper";

interface IdentifyingNumberFormProps {
  control: Control<BiographicData>;
}

export const IdentifyingNumberForm = ({
  control,
}: IdentifyingNumberFormProps) => {
  const primaryColor = useThemeColor({}, "primary");
  return (
    <>
      <H2 style={styles.title}>{tHelper("identifyingNum")}</H2>
      <View style={[styles.container, { borderColor: primaryColor }]}>
        <ControlledInput
          component={InputSelect}
          name={"mnuType"}
          label={tHelper("idNumType")}
          control={control}
          items={identifyingNumberTypes}
        />
        <ControlledInput
          component={InputText}
          name={"mnu"}
          label={tHelper("idNum")}
          control={control}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: -10,
    borderWidth: 1,
    padding: 10,
    borderRadius: 4,
    gap: 20,
  },
  title: { marginHorizontal: -10 },
});
