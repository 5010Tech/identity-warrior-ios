import { useRef, useCallback } from "react";

export const useDeferredPromise = <T = void>() => {
  const promiseRef = useRef<{ resolve: (value: T) => void } | null>(null);

  const waitForUserAction = useCallback((): Promise<T> => {
    return new Promise<T>((resolve) => {
      promiseRef.current = { resolve };
    });
  }, []);

  const resolveAction = useCallback((result: T) => {
    promiseRef.current?.resolve(result);
    promiseRef.current = null; // Cleanup after resolving
  }, []);

  return { waitForUserAction, resolveAction };
};
