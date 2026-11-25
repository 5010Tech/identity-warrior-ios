import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { FormButtons } from "@/components/form";
import { BiographicsForm } from "@/components/form/BiographicsForm";
import { DNAForm } from "@/components/form/DnaForm";
import { ControlledInput, InputText } from "@/components/input";
import { FormContainer } from "@/components/Structure";
import { SafeAreaView } from "@/components/themed";
import { tHelper } from "@/translations/translationHelper";
import { BiographicData } from "@/types/BiographicData";
import { useRouter } from "expo-router";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { StyleSheet } from "react-native";
import { z } from "zod";

// const formSchema = z.object({
//   firstName: z.string(),
//   lastName: z.string(),
//   sex: z.string(),
//   height: z.coerce
//     .number()
//     .int()
//     .positive()
//     .min(10, { message: "Must Be Greater Than 10" })
//     .max(108, { message: "Must Be Less Than 108" }),
//   weight: z.coerce
//     .number()
//     .int()
//     .positive()
//     .min(1, { message: "Must Be Greater Than 1" })
//     .max(499, { message: "Must Be Less Than 499" }),
//   eyeColor: z.string(),
//   hairColor: z.string(),
//   race: z.string(),
//   dob: z.coerce.date().refine((data) => data < new Date(), {
//     message: "Start date must be in the past",
//   }),
//   birthCountry: z.string(),
//   citizenship: z.string(),
//   collectionReason: z.string(),
// });

export default function AutofillSettings() {
  const router = useRouter();

  const { getValue, setValue } = useAutofill();

  const methods = useForm<BiographicData>({
    defaultValues: getValue("biographics") || {},
    // resolver: zodResolver(formSchema),
  });
  const { control, handleSubmit } = methods;

  const onSubmit = async (data: BiographicData) => {
    try {
      await setValue("biographics", data);
      router.back();
    } catch (e) {
      console.error("Could not set autofill values", e);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={StyleSheet.absoluteFill}>
      <FormContainer style={styles.container}>
        <BiographicsForm control={control} sectioned>
          <ControlledInput
            label={tHelper("dnaSystem")}
            control={control}
            name="dnaSystem"
            component={InputText}
          />
        </BiographicsForm>
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
