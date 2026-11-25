import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef } from "react";

/**
 * Leaves the screen, once. A second tap on a Back or Cancel button before
 * the screen has gone would go back twice, which on a capture screen takes
 * the collection screen with it and drops the operator out of the
 * collection. Only the first tap counts; the guard is lifted if the screen
 * comes back into view.
 */
export const useGoBackOnce = () => {
  const router = useRouter();
  const leaving = useRef(false);
  useFocusEffect(
    useCallback(() => {
      leaving.current = false;
    }, []),
  );
  return useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);
};
