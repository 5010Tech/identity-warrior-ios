import openSettings from "@/util/openNetworkSettings";
import Dialog from "react-native-dialog";
import { Text } from "../themed";
import { tHelper } from "@/translations/translationHelper";
import { DeviceConnectionType } from "@/types/Device";
import { useAutofillSelector } from "../autofill/context/useAutofillSelector";

interface ConnectionFailedDialogProps {
  visible: boolean;
  onRetry: () => void;
  onClose: () => void;
  onFallback?: () => void;
  deviceType?: DeviceConnectionType;
}

export const ConnectionFailedDialog = ({
  visible,
  onRetry,
  onClose,
  onFallback,
  deviceType = "wifi",
}: ConnectionFailedDialogProps) => {
  const allowContactless = useAutofillSelector(
    (s) => s.appSettings.fingerprintCaptureSequence !== "tenRolled",
  );
  return (
    <Dialog.Container verticalButtons visible={visible}>
      <Dialog.Title>{tHelper("connectionFailed")}</Dialog.Title>
      <Dialog.Description>
        {tHelper("noConnect1")}
        {deviceType === "wifi" ? tHelper("wifi") : tHelper("bluetooth")}{" "}
        {tHelper("noConnect2")}
        {onFallback && allowContactless && (
          <>
            {tHelper("noConnect3")}
            <Text style={{ fontWeight: "bold" }}>
              {tHelper("contactlessCapture")}
            </Text>
          </>
        )}
        .
      </Dialog.Description>
      <Dialog.Button
        onPress={() =>
          openSettings(deviceType === "bluetooth" ? "Bluetooth" : undefined)
        }
        label={tHelper("settings")}
      />
      <Dialog.Button onPress={() => onRetry()} label={tHelper("retry")} bold />
      {onFallback && allowContactless && (
        <Dialog.Button onPress={onFallback} label={tHelper("useContactless")} />
      )}
      <Dialog.Button onPress={onClose} label={tHelper("close")} color={"red"} />
    </Dialog.Container>
  );
};
