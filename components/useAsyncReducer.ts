import { DispatchAction } from "@/types";
import { useReducer, useRef, useEffect, Reducer, useCallback } from "react";

type asyncDispatch = (asyncAction: asyncAction) => void;

export type asyncAction =
  | DispatchAction<any>
  | ((dispatch: asyncDispatch, getState: <T = any>() => T) => void);

export const useAsyncReducer = <T>(
  reducer: Reducer<T | any, DispatchAction<any>>,
  initialState: any,
): [any, asyncDispatch] => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);

  const getState = useCallback(() => stateRef.current, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const asyncDispatch: asyncDispatch = useCallback(
    async (action) => {
      if (typeof action === "function") {
        return await action(asyncDispatch, getState);
      } else {
        dispatch(action);
        return action;
      }
    },
    [getState],
  );

  return [state, asyncDispatch];
};
