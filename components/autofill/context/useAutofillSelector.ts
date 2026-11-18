import { useRef, useCallback } from "react";
import { useSyncExternalStore } from "react";
import { AutofillData, useAutofill } from "./AutofillContext";

export function shallowEqual(a: any, b: any) {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  )
    return false;

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  for (let i = 0; i < aKeys.length; i++) {
    const k = aKeys[i]!;
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!Object.is(a[k], (b as any)[k])) return false;
  }
  return true;
}

type EqualityFn<T> = (a: T, b: T) => boolean;

export function useAutofillSelector<TSelected>(
  selector: (state: AutofillData) => TSelected,
  isEqual: EqualityFn<TSelected> = Object.is,
): TSelected {
  const { getState, subscribe } = useAutofill();

  const lastSelectedRef = useRef<TSelected | undefined>(undefined);

  const getSnapshot = useCallback(() => {
    const state = getState();
    const nextSelected = selector(state);
    const prevSelected = lastSelectedRef.current;

    if (prevSelected !== undefined && isEqual(nextSelected, prevSelected)) {
      return prevSelected;
    }
    lastSelectedRef.current = nextSelected;
    return nextSelected;
  }, [getState, selector, isEqual]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
