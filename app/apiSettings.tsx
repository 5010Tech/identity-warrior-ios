import { AppLogo200 } from "@/components/AppLogo";
import { FormButtons } from "@/components/form";
import { ControlledInput, InputText } from "@/components/input";
import { Spinner } from "@/components/Spinner";
import { View } from "@/components/themed";
import { useUserInfo } from "@/components/user";
import { login } from "@/components/user/userReducer";
import { useUserActions } from "@/components/user/useUserActions";
import { AuthBody } from "@/types/auth";
import { APIClient } from "@/util/server/APIClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { getItemAsync } from "expo-secure-store";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { z } from "zod";
import { tHelper } from '@/translations/translationHelper';

const styles = StyleSheet.create({
  scrollContainer: {
    minHeight: "100%",
  },
  container: {
    padding: 5,
    height: "100%",
  },
  logo: {
    marginHorizontal: "auto",
    marginVertical: 50,
  },
  form: {
    gap: 10,
  },
});

const formValidation = z.object({
  apiKey: z.string().min(1, tHelper("reqField")),
  baseUrl: z.string().min(1, tHelper("reqField")).url(tHelper("invalidUrl")),
  usernameOrEmail: z.string().min(1, tHelper("reqField")),
});

export default function LoginPage() {
  const { control, handleSubmit, setValue } = useForm<AuthBody>({
    resolver: zodResolver(formValidation),
  });
  const dispatch = useUserActions();
  const postLogin = async (body: AuthBody) => {
    await login(body)(dispatch);
  };

  const { fetching } = useUserInfo();

  useEffect(() => {
    const setFieldValues = async () => {
      const apiKey = getItemAsync("apiKey");
      const usernameOrEmail = getItemAsync("usernameOrEmail");

      setValue("apiKey", (await apiKey) || "");
      setValue("usernameOrEmail", (await usernameOrEmail) || "");
      setValue("baseUrl", APIClient.baseUrl);
    };
    setFieldValues();
  }, [setValue]);

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        contentInsetAdjustmentBehavior="automatic"
      >
        {fetching && <Spinner />}
        <View style={styles.container}>
          <AppLogo200 style={styles.logo} />
          <View style={styles.form}>
            <ControlledInput
              control={control}
              component={InputText}
              label={"URL"}
              name="baseUrl"
            />
            <ControlledInput
              control={control}
              component={InputText}
              label={tHelper("userName")}
              name="usernameOrEmail"
            />
            <ControlledInput
              control={control}
              component={InputText}
              label={tHelper("password")}
              name="apiKey"
              secureTextEntry
            />
            <FormButtons
              onCancel={router.back}
              onSubmit={handleSubmit(postLogin)}
            />
          </View>
        </View>
      </ScrollView>
    </>
  );
}
