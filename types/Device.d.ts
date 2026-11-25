// "wifi" is an IdentiFI, "bluetooth" a NeoScan, "grabba" a Grabba A-Series
// (Bluetooth LE).
export type DeviceConnectionType = "bluetooth" | "wifi" | "grabba";

export interface Device {
  selected?: boolean;
  serialNumber?: string;
  modelNumber?: string;
  connectionType: DeviceConnectionType;
  ssid?: string;
}
