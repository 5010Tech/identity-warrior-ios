import { Device } from "@/types/Device";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const storeDevices = (devices: Device[]) => {
  AsyncStorage.setItem("devices", JSON.stringify(devices));
  return devices;
};

export const retrieveDevices = async (): Promise<Device[]> =>
  JSON.parse((await AsyncStorage.getItem("devices")) || "[]");

export const getActiveDevice = async () =>
  (await retrieveDevices()).find((d: Device) => d.selected);
