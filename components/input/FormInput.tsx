import React from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { Controller } from "react-hook-form";

const FormInput = ({ control, name, label, ...otherProps }) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { value, onChange, onBlur },
        fieldState: { error },
      }) => (
        <>
          <Text style={styles.labelText}>{label}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            {...otherProps}
          />
          {error && <Text style={styles.errorMessage}>{error.message}</Text>}
        </>
      )}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 5,
    marginTop: 5,
    padding: 8,
  },
  errorMessage: {
    color: "red",
    marginBottom: 10,
  },
  labelText: {
    fontSize: 16,
  },
});

export default FormInput;
