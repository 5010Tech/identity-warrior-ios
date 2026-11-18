import { Control, useFormContext } from "react-hook-form";
import { ControlledInput, InputText, InputSelect, InputDate } from "../input";
import { BiographicData } from "@/types";
import { tHelper } from "@/translations/translationHelper";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "@/components/themed";
import { useRouter } from "expo-router";
import { useWatch, useController } from "react-hook-form";
import { useEffect } from "react";
import { BiographicsForm } from "./BiographicsForm";

interface DNAFormProps {
  control: Control<BiographicData>;
  fromSettings?: boolean;
}

type IconButtonProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string; // icon color
  backgroundColor?: string; // button background
};

export const IconButton = ({
  icon,
  onPress,
  size = 24,
  color = "white",
  backgroundColor = "#007AFF",
}: IconButtonProps) => {
  return (
    <Pressable onPress={onPress} style={[styles.button, { backgroundColor }]}>
      <MaterialIcons name={icon} size={size} color={color} />
    </Pressable>
  );
};

export const DNAForm = ({ fromSettings = false }: DNAFormProps) => {
  const scanColor = useThemeColor({}, "primary");
  const router = useRouter();

  const { control, setValue, watch } = useFormContext<BiographicData>();

  const dnaIdValue = watch("dnaId");

  useEffect(() => {
    if (!fromSettings && !dnaIdValue) {
      setValue("dnaSystem", ""); // clear dnaSystem when dnaId is empty
    }
  }, [dnaIdValue, fromSettings, setValue]);

  return (
    <>
      {fromSettings ? (
        <ControlledInput
          label={tHelper("dnaSystem")}
          control={control}
          name="dnaSystem"
          component={InputText}
        />
      ) : (
        <>
          {/* dnaId input + scan button */}
          <View style={{ marginVertical: 8 }}>
            <Text style={styles.label}>{tHelper("dnaId")}</Text>
            <View style={styles.row}>
              <View style={styles.inputWrapper}>
                <ControlledInput
                  control={control}
                  name="dnaId"
                  component={InputText}
                  style={styles.input}
                />
              </View>
              <IconButton
                icon="qr-code-scanner"
                color="white"
                backgroundColor={scanColor}
                onPress={() =>
                  router.push({
                    pathname: "/capture/[transactionType]/biographics/barkoder",
                    params: { scanType: "DNA" },
                    key: `barkoder-${Date.now()}`,
                  })
                }
              />
            </View>
          </View>

          {/* dnaSystem only if dnaId has a value */}
          {dnaIdValue ? (
            <ControlledInput
              label={tHelper("dnaSystem")}
              control={control}
              name="dnaSystem"
              component={InputText}
            />
          ) : null}
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 4,
    fontSize: 16,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputWrapper: {
    flex: 1, // takes remaining horizontal space
    marginRight: 8, // space between input and button
  },
  input: {
    width: "100%", // fill the wrapper
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  button: {
    width: 40, // fixed square for the button
    height: 40,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    justifyContent: "center", // center vertically
    alignItems: "center", // center horizontally
  },
});
