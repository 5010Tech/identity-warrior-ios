import { FormButtons, IdentifyingNumberForm } from "@/components/form";
import { BiographicsForm } from "@/components/form/BiographicsForm";
import { DNAForm } from "@/components/form/DnaForm";
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
  autofill: {
    fontSize: 20,
  },
});
