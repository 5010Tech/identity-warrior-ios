import { FieldOperationDispatch } from "@/types/DispatchAction";
import { getFieldOperations } from "@/util/fieldOperations";
import { CaptureState } from "../types";

export const captureReducer = (
  state: CaptureState,
  { name, method, args }: FieldOperationDispatch<CaptureState>,
): CaptureState => {
  return (getFieldOperations(name, state) as any)?.[method](...args);
};
