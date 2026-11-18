import { ViewProps } from "react-native";

export type ChangeEventPayload = {
  value: string;
};

export type ExpoIdentifiStreamType = "finger" | "irisLeft" | "irisRight";

export interface ExpoIdentifiViewProps extends ViewProps {
  streamType?: ExpoIdentifiStreamType;
}

export enum ExpoIdentifiCaptureErrorCode {
  NFIQ_TOO_LOW = 1,
  FAILED_TO_START = 9,
  ROLLING_SMEAR = 304,
  HORIZONTAL_SHIFT = 305,
  VERTICAL_SHIFT = 306,
  HORIZONTAL_AND_VERTICAL_SHIFT = 307,
  SEGMENTATION_ERROR = 399,
  UNKNOWN = -600,
}
