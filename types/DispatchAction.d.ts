import { FieldOperations } from "./FieldOperations";

export type DispatchAction<T> = {
  type: string;
  payload?: T;
};

export type FieldOpKey = Exclude<keyof FieldOperations, "value">;

type DispatchByMethod<T> = {
  [K in FieldOpKey]: {
    name: NestedKeyOf<T>;
    method: K;
    args: Parameters<FieldOperations[K]>;
  };
};

export type FieldOperationDispatch<T> = DispatchByMethod<T>[FieldOpKey];
