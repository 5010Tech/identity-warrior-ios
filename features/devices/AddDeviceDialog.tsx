import openSettings from "@/util/openNetworkSettings";
import Dialog from "react-native-dialog";
import { tHelper } from "@/translations/translationHelper";

interface AddDeviceDialogProps {
  visible: boolean;
  toggle: () => void;
  addDevice: () => Promise<void>;
}

export const AddDeviceDialog = ({
  visible,
  toggle,
  addDevice,
}: AddDeviceDialogProps) => {
  return (
    <Dialog.Container verticalButtons visible={visible}>
      <Dialog.Title>{tHelper("connectDevice0")}</Dialog.Title>
      <Dialog.Description>{tHelper("connectDevice1")}</Dialog.Description>
      <Dialog.Description>{tHelper("connectDevice2")}</Dialog.Description>
      <Dialog.Description>{tHelper("connectDevice3")}</Dialog.Description>
      <Dialog.Description>{tHelper("connectDevice4")}</Dialog.Description>
      <Dialog.Description>{tHelper("connectDesc")}</Dialog.Description>
      <Dialog.Button
        onPress={openSettings}
        label={tHelper("networkSettings")}
      />
      <Dialog.Button onPress={addDevice} label={tHelper("addDevice")} bold />
      <Dialog.Button onPress={toggle} label={tHelper("cancel")} color={"red"} />
    </Dialog.Container>
  );
};
