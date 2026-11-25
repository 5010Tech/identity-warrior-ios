import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { useEffect } from "react";
import { useSlapshotContext } from "./SlapshotContext";

/**
 * Keeps contactless capture in step with Selfie Mode in App Settings. Rendered
 * inside the settings provider, which sits below the Slapshot provider.
 */
export const SelfieModeSync = () => {
  const selfieMode = useAutofillSelector((s) => !!s.appSettings?.selfieMode);
  const viewModel = useSlapshotContext();
  const setSelfieMode = viewModel?.setSelfieMode;
  useEffect(() => {
    setSelfieMode?.(selfieMode);
  }, [selfieMode, setSelfieMode]);
  return null;
};
