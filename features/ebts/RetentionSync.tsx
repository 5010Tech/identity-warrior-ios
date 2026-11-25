import Constants from "expo-constants";
import { installFieldLog } from "@/util/fieldLog";
import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { useEffect } from "react";
import { applyRetention, retentionDays } from "./vault";

/**
 * Starts the field log, and applies the retention settings each time the app starts (and when they are
 * changed): expired stored transactions and old exported files are deleted.
 */
export const RetentionSync = () => {
  const appSettings = useAutofillSelector((s) => s.appSettings);
  const { submissionDays, exportDays } = retentionDays(appSettings);
  useEffect(() => {
    installFieldLog(Constants.expoConfig?.version);
  }, []);
  useEffect(() => {
    applyRetention().catch(console.warn);
  }, [submissionDays, exportDays]);
  return null;
};
