import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { InputSelect } from "@/components/input";
import { fingerprintCaptureSequences } from "@/constants/SelectOptions";
import { tHelper } from "@/translations/translationHelper";
import { fingerprintCaptureSequence } from "@/types";
import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import { StyleSheet } from "react-native";
import Dialog from "react-native-dialog";

interface SetCaptureSequenceDialogProps {
  setOpen: (open: boolean) => void;
  isOpen: boolean;
  onSequenceChange?: (sequence: fingerprintCaptureSequence) => void;
}

export default function SetCaptureSequenceDialog({
  setOpen,
  isOpen,
  onSequenceChange,
}: SetCaptureSequenceDialogProps) {
  const { setValue, getValue } = useAutofill();

  const [sequence, setSequence] = useState<fingerprintCaptureSequence>(
    getValue("appSettings")?.fingerprintCaptureSequence || "tenFlat",
  );

  const handleSetSequence = () => {
    const appSettings = getValue("appSettings");
    if (!appSettings) return;

    appSettings.fingerprintCaptureSequence = sequence;
    setValue("appSettings", appSettings);
    setOpen(false);
    onSequenceChange && onSequenceChange(sequence);
  };

  return (
    <Dialog.Container visible={isOpen}>
      <Dialog.Title>{tHelper("setCaptureSequence")}</Dialog.Title>
      <Dialog.Description style={{ marginBottom: 15 }}>
        {tHelper("setCaptureSequenceDesc")}
      </Dialog.Description>
      <Picker
        selectedValue={sequence}
        onValueChange={(value) =>
          setSequence(value as fingerprintCaptureSequence)
        }
        itemStyle={styles.pickerItem}
        style={{ margin: 0, padding: 0 }}
      >
        {fingerprintCaptureSequences.map((item) => (
          <Picker.Item key={item.value} label={item.label} value={item.value} />
        ))}
      </Picker>
      <Dialog.Button onPress={() => setOpen(false)} label={tHelper("cancel")} />
      <Dialog.Button
        disabled={!sequence}
        onPress={handleSetSequence}
        label={tHelper("confirm")}
      />
    </Dialog.Container>
  );
}

const styles = StyleSheet.create({
  pickerItem: {
    fontSize: 16,
  },
});
