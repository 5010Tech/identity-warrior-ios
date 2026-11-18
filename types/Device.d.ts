export type DeviceConnectionType = "bluetooth" | "wifi";

export interface Device {
  selected?: boolean;
  serialNumber?: string;
  modelNumber?: string;
  connectionType: DeviceConnectionType;
  ssid?: string;
}
