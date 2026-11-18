export type ChangeEventPayload = {
  value: string;
};

export type ExpoNeoScanViewProps = {
  name: string;
};

export interface NeoScanDevice {
  name: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
}
