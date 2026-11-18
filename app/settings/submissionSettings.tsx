import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { FormButtons } from "@/components/form";
import { ControlledInput, InputSelect, InputText } from "@/components/input";
import { FormContainer } from "@/components/Structure";
import { SafeAreaView } from "@/components/themed";
import { activityCategories } from "@/constants/SelectOptions";
import { SubmissionSettings } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React from "react";
import { useForm } from "react-hook-form";
import { StyleSheet } from "react-native";
import { z } from "zod";
import { tHelper } from "@/translations/translationHelper";

const formSchema = z.object({
  ori: z.string().refine((val) => !val || val.length === 9, {
    message: tHelper("validORI"),
  }),
  oan: z.string().max(4, {
    message: tHelper("validOAN"),
  }),
  dai: z.string().refine((val) => !val || val.length === 9, {
    message: tHelper("validDAI"),
  }),
  dan: z.string(),
  cai: z.string().refine((val) => !val || val.length === 9, {
    message: tHelper("validCAI"),
  }),
  on: z.string(),
  ou: z.string(),
  osu: z.string(),
  activitySiteId: z.string(),
  activityCategory: z.string(),
  activityTerminal: z.string(),
});

export default function SubmissionSettingsScreen() {
  const router = useRouter();

  const { getValue, setValue } = useAutofill();
  const { control, handleSubmit } = useForm({
    defaultValues: getValue("submissionSettings") ?? {},
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: SubmissionSettings) => {
    setValue("submissionSettings", data);
    router.back();
  };

  return (
    <SafeAreaView edges={["bottom"]} style={StyleSheet.absoluteFill}>
      <FormContainer style={styles.container}>
        <ControlledInput
          component={InputText}
          control={control}
          name={"ori"}
          label={tHelper("ori")}
        />
        <ControlledInput
          component={InputText}
          control={control}
          name={"oan"}
          label={tHelper("oan")}
        />
        <ControlledInput
          component={InputText}
          control={control}
          name={"dai"}
          label={tHelper("dai")}
        />
        <ControlledInput
          component={InputText}
          control={control}
          name={"dan"}
          label={tHelper("dan")}
        />
        <ControlledInput
          component={InputText}
          control={control}
          name={"cai"}
          label={tHelper("cai")}
        />
        <ControlledInput
          component={InputText}
          control={control}
          name={"on"}
          label={tHelper("on")}
        />
        <ControlledInput
          component={InputText}
          control={control}
          name={"ou"}
          label={tHelper("ou")}
        />
        <ControlledInput
          component={InputText}
          control={control}
          name={"osu"}
          label={tHelper("osu")}
        />
        <ControlledInput
          component={InputText}
          control={control}
          name={"activitySiteId"}
          label={tHelper("acitveSiteID")}
        />
        <ControlledInput
          component={InputSelect}
          control={control}
          name={"activityCategory"}
          label={tHelper("activeCat")}
          items={activityCategories}
        />
        <ControlledInput
          component={InputText}
          control={control}
          name={"activityTerminal"}
          label={tHelper("activityTerminal")}
        />
      </FormContainer>
      <FormButtons onCancel={router.back} onSubmit={handleSubmit(onSubmit)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
  },
});
