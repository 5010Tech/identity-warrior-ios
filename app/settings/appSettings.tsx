import { Button } from "@/components/Button";
import { FormContainer } from "@/components/Structure";
import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { FormButtons } from "@/components/form";
import { ControlledInput, InputSelect, InputText } from "@/components/input";
import { SafeAreaView, useThemeColor } from "@/components/themed";
import {
  fingerprintCaptureSequences,
  trueFalseOptions,
} from "@/constants/SelectOptions";
import { tHelper } from "@/translations/translationHelper";
import { AppSettings } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { deleteItemAsync } from "expo-secure-store";
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
  contactlessAdministered: z.coerce.boolean(),
  fingerprintCaptureSequence: z
    .string()
    .nonempty({ message: tHelper("reqField") }),
});

export default function AppSettingsScreen() {
  const router = useRouter();
  const { getValue, setValue } = useAutofill();
  const { control, handleSubmit } = useForm({
    defaultValues: getValue("appSettings") ?? {},
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: AppSettings) => {
    setValue("appSettings", data);
    router.back();
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
        },
      },
    ]);
  };

  const startCalibration = () => {
    router.push({
      pathname: "/settings/calibrationScreen",
    });
  };

  const secondaryColor = useThemeColor({}, "secondary");
  const dangerColor = useThemeColor({}, "danger");

  return (
    <SafeAreaView edges={["bottom"]} style={StyleSheet.absoluteFill}>
      <FormContainer style={styles.container}>
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
          component={InputSelect}
          control={control}
          name={"contactlessAdministered"}
          label={tHelper("contactlessAdmin")}
          items={trueFalseOptions}
        />
        <ControlledInput
          component={InputSelect}
          control={control}
          name={"fingerprintCaptureSequence"}
          label={tHelper("fingerprintCaptureSequence")}
          items={fingerprintCaptureSequences}
        />
      </FormContainer>
      <View style={{ paddingHorizontal: 10, gap: 10 }}>
        <Button text={tHelper("calibrate")} onPress={startCalibration} />
        <Link href="/apiSettings" asChild>
          <Button
            style={{
              backgroundColor: secondaryColor,
            }}
            text={tHelper("apiSettings")}
          />
        </Link>
        <Button
          text={tHelper("clearData")}
          style={{ backgroundColor: dangerColor }}
          onPress={onDeleteData}
        />
      </View>
      <FormButtons onCancel={router.back} onSubmit={handleSubmit(onSubmit)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
  },
});
