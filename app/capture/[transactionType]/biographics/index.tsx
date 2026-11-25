import { FormButtons, IdentifyingNumberForm } from "@/components/form";
import { BiographicsForm } from "@/components/form/BiographicsForm";
import { DNAForm } from "@/components/form/DnaForm";
import { DodBiographicsForm } from "@/components/form/DodBiographicsForm";
import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { useCaptureValue } from "@/features/capture/context/hooks";
import { tHelper } from "@/translations/translationHelper";
import { DocumentsForm } from "@/components/form/DocumentsForm";
import { FormContainer } from "@/components/Structure";
import { SafeAreaView, View } from "@/components/themed";
import { useCaptureActions } from "@/features/capture/context/hooks";
import { BiographicData, DLData } from "@/types";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { DeviceEventEmitter, StyleSheet } from "react-native";

export default function BiographicsScreen() {
  const { setValue, getValue } = useCaptureActions();
  const {
    control,
    handleSubmit,
    setValue: setFormValue,
  } = useFormContext<BiographicData>();

  const router = useRouter();
  const isDod = useAutofillSelector(
    (s) => s.appSettings?.collectionMode !== "DHS",
  );
  const dodTot = useCaptureValue<string | undefined>("dodTot");

  const onSubmit = (data: any) => {
    setValue("transaction.biographicData", data);
    setValue("biographicsComplete", true);
    router.back();
  };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "dl_results",
      (data: DLData) => {},
    );
    return () => sub.remove();
  }, [getValue, setFormValue]);

  if (isDod) {
    // DoD: the Android app's Type-2 screen (cards, Back / Save).
    return (
      <SafeAreaView edges={["bottom"]} style={StyleSheet.absoluteFill}>
        <FormContainer style={styles.dodContainer}>
          <DodBiographicsForm control={control} dodTot={dodTot} />
        </FormContainer>
        <FormButtons
          onCancel={router.back}
          onSubmit={handleSubmit(onSubmit)}
          cancelText={tHelper("back")}
          submitText={tHelper("save")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={StyleSheet.absoluteFill}>
      <FormContainer>
        <View style={styles.header}></View>
        <BiographicsForm control={control} />
        <DNAForm control={control} />
        <IdentifyingNumberForm control={control} />
        <DocumentsForm control={control} />
      </FormContainer>
      <FormButtons onCancel={router.back} onSubmit={handleSubmit(onSubmit)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "flex-end",
  },
  dodContainer: {
    paddingTop: 8,
  },
  autofill: {
    fontSize: 20,
  },
});
