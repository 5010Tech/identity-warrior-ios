import { DeviceListItem } from "@/features/devices/DeviceListItem";
import { useActiveDevice } from "@/components/device/activeDevice";
import { useDevices } from "@/components/device/devices";
import { Spinner } from "@/components/Spinner";
import { H2, SafeAreaView } from "@/components/themed";
import { ExpoIdentifi } from "@/modules/expo-identifi";
import openSettings from "@/util/openNetworkSettings";
import { FontAwesome } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import WifiManager from "react-native-wifi-reborn";
import { tHelper } from "@/translations/translationHelper";
import { DeviceConnectionType } from "@/types/Device";
import { ExpoNeoScanModule } from "@/modules/expo-neo-scan";
import { AddDeviceDialog } from "@/features/devices/AddDeviceDialog";

export default function DevicesScreen() {
  const { devices, setActiveDevice, deleteDevice, addDevice } = useDevices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const { connecting, disconnectFromDevice } = useActiveDevice();

  const handleDelete = (i: number) => () => {
    const { modelNumber, serialNumber } = devices[i];
    Alert.alert("Confirm", `Delete ${modelNumber} - ${serialNumber}?`, [
      {
        text: tHelper("cancel"),
        style: "cancel",
      },
      {
        text: tHelper("delete"),
        style: "destructive",
        onPress: () => {
          deleteDevice(i);
        },
      },
    ]);
  };

  const confirmDeviceAlert = ({
    ssid,
    modelNumber,
    serialNumber,
    connectionType,
  }: {
    ssid?: string;
    modelNumber: string;
    serialNumber: string;
    connectionType: DeviceConnectionType;
  }) => {
    Alert.alert("Confirm", `Add ${modelNumber} - ${serialNumber} to devices?`, [
      {
        text: "Cancel",
      },
      {
        text: "OK",
        onPress: () => {
          addDevice({
            ssid,
            modelNumber,
            serialNumber,
            selected: true,
            connectionType,
          });
        },
      },
    ]);
  };

  const addWiFiDevice = async () => {
    setShowSpinner(true);
    setDialogOpen(false);
    try {
      const ssid = await WifiManager.getCurrentWifiSSID();
      setShowSpinner(false);
      const index = devices.findIndex((d) => d.ssid === ssid);
      if (index >= 0) {
        Alert.alert(
          tHelper("deviceAlreadyAdded"),
          `${ssid} ` + tHelper("deviceAddDetails"),
          [
            {
              text: tHelper("yesActive"),
              isPreferred: true,
              onPress: () => {
                setActiveDevice(index);
              },
            },
            {
              text: tHelper("noActive"),
            },
          ],
        );
      } else {
        try {
          setShowSpinner(true);
          await ExpoIdentifi.connect();
          const { modelNumber, serialNumber } =
            await ExpoIdentifi.getDeviceInfo();
          await disconnectFromDevice();
          setShowSpinner(false);
          confirmDeviceAlert({
            ssid,
            modelNumber,
            serialNumber,
            connectionType: "wifi",
          });
        } catch (error) {
          console.error("Failed to connect to device", error);
          Alert.alert(tHelper("error"), tHelper("deviceConnectFail"));
          setShowSpinner(false);
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert(tHelper("error"), tHelper("wifiFailed"), [
        { text: tHelper("settings"), onPress: openSettings },
        { text: tHelper("cancel"), style: "cancel" },
      ]);
      setShowSpinner(false);
    }
  };

  const addBluetoothDevice = async () => {
    try {
      const { modelNumber, serialNumber } =
        await ExpoNeoScanModule.getDeviceInfo();
      confirmDeviceAlert({
        modelNumber,
        serialNumber,
        connectionType: "bluetooth",
      });
    } catch (e) {
      console.error(e);
      Alert.alert(
        "Error",
        "Could not find any compatible bluetooth capture devices. Please make sure your device is connected.",
        [
          {
            text: "Bluetooth Settings",
            onPress: () => openSettings("Bluetooth"),
          },
          { text: "Close" },
        ],
      );
    }
  };

  const handleAddDevice = async () => {
    Alert.alert(
      "Select Connection Type",
      "Please select your capture device's connection type",
      [
        { text: "Wi-Fi", onPress: setDialogOpen.bind(null, true) },
        { text: "Bluetooth", onPress: addBluetoothDevice },
        { text: "Cancel" },
      ],
    );
  };

  return (
    <>
      <SafeAreaView
        edges={["bottom"]}
        style={[StyleSheet.absoluteFill, styles.container]}
      >
        {devices.map((device, i) => (
          <DeviceListItem
            {...device}
            key={i}
            setActive={() => setActiveDevice(i)}
            onDelete={handleDelete(i)}
          />
        ))}
        <TouchableOpacity style={styles.newButton} onPress={handleAddDevice}>
          <H2>
            <FontAwesome name="plus" size={24} /> {tHelper("addDevice")}
          </H2>
        </TouchableOpacity>
        <AddDeviceDialog
          toggle={() => setDialogOpen(false)}
          addDevice={addWiFiDevice}
          visible={dialogOpen}
        />
      </SafeAreaView>
      {(showSpinner || connecting) && <Spinner />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
  },
  newButton: {
    width: "100%",
    textAlign: "center",
    padding: 10,
    alignItems: "center",
  },
});
