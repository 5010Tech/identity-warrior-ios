import { countryOptions, documentTypeOptions } from "@/constants/SelectOptions";
import { BiographicData, DocumentDTO } from "@/types";
import { FontAwesome } from "@expo/vector-icons";
import { Control, useController, useFieldArray } from "react-hook-form";
import { StyleSheet, TouchableOpacity } from "react-native";
import { ControlledInput, InputDate, InputSelect, InputText } from "../input";
import { H2, Text, useThemeColor, View } from "../themed";
import { tHelper } from "@/translations/translationHelper";
import React from "react";

interface DocumentsFormProps {
  control: Control<BiographicData>;
}

export const DocumentsForm = ({ control }: DocumentsFormProps) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "documents",
  });

  const {
    fieldState: { error },
  } = useController({
    control,
    name: "documents",
  });

  const primaryColor = useThemeColor({}, "primary");
  const secondaryColor = useThemeColor({}, "secondary");
  const dangerColor = useThemeColor({}, "danger");

  return (
    <View style={styles.container}>
      <H2>{tHelper("documents")}</H2>
      {error && <Text style={{ color: dangerColor }}>{error.message}</Text>}
      {fields.map((field, index) => {
        const fieldName = (name: keyof DocumentDTO) =>
          `documents[${index}].${name}`;
        return (
          <View
            key={field.id}
            style={[styles.itemContainer, { borderColor: secondaryColor }]}
          >
            <ControlledInput
              component={InputSelect}
              items={documentTypeOptions}
              name={fieldName("type")}
              label={tHelper("type")}
              control={control}
            />
            <ControlledInput
              component={InputText}
              name={fieldName("identification")}
              label={tHelper("idNumber")}
              control={control}
            />
            <ControlledInput
              component={InputSelect}
              items={countryOptions}
              name={fieldName("country")}
              label={tHelper("country")}
              control={control}
            />
            <ControlledInput
              component={InputText}
              name={fieldName("description")}
              label={tHelper("description")}
              control={control}
            />
            <ControlledInput
              component={InputDate}
              name={fieldName("issueDate")}
              label={tHelper("issueDate")}
              control={control}
            />
            <ControlledInput
              component={InputDate}
              name={fieldName("expirationDate")}
              label={tHelper("expireDate")}
              control={control}
            />
            <TouchableOpacity
              style={styles.delete}
              onPress={() => remove(index)}
            >
              <FontAwesome name="trash" size={24} color={secondaryColor} />
            </TouchableOpacity>
          </View>
        );
      })}
      <TouchableOpacity
        style={styles.add}
        onPress={() =>
          append({
            country: "",
            description: "",
            expirationDate: "",
            issueDate: "",
            type: "",
            identification: "",
          })
        }
      >
        <Text style={{ color: primaryColor, fontSize: 24, fontWeight: 600 }}>
          <FontAwesome name="plus" size={24} /> {tHelper("addDoc")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginHorizontal: -10,
    marginVertical: 10,
  },
  itemContainer: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    gap: 20,
  },
  delete: {
    alignSelf: "flex-end",
    flexShrink: 1,
    padding: 10,
  },
  add: {
    alignSelf: "center",
    justifyContent: "center",
    flexShrink: 1,
  },
});
