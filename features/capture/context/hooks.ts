import { NestedKeyOf } from "@/types";
import { getFieldOperations } from "@/util/fieldOperations";
import { useContext, useMemo } from "react";
import { CaptureState } from "../types";
import {
  CaptureActionsContext,
  CaptureDataContext,
  SetValueFn,
} from "./CaptureProvider";

export interface CaptureActions {
  setValue: SetValueFn;
  takeSnapshot: (name: NestedKeyOf<CaptureState>) => void;
  restoreSnapshot: (name: NestedKeyOf<CaptureState>) => void;
  getValue: <T>(name: NestedKeyOf<CaptureState>) => T;
  setEnabled: (
    name:
      | "fingersEnabled"
      | "faceEnabled"
      | "biographicsEnabled"
      | "irisEnabled",
    enabled: boolean,
  ) => void;
}

export const useCaptureActions = (): CaptureActions =>
  useContext(CaptureActionsContext);

export function useCaptureValue<T>(name?: NestedKeyOf<CaptureState>): T {
  const captureData = useContext(CaptureDataContext);

  const value = useMemo(() => {
    return name ? getFieldOperations(name, captureData).value : captureData;
  }, [name, captureData]);

  return value;
}
