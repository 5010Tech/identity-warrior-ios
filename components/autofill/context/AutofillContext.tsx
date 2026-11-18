import { SubmissionItem } from "@/components/submissions/types";
import { AppSettings, SubmissionSettings } from "@/types";
import { BiographicData } from "@/types/BiographicData";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

export interface AutofillData {
  biographics: BiographicData;
  submissionSettings: SubmissionSettings;
  transactions: SubmissionItem[];
  appSettings: AppSettings;
}

type Subscribe = (listener: () => void) => () => void;

type setValue = <T extends keyof AutofillData>(
  key: T,
  value: AutofillData[T],
) => void;

type getValue = <T extends keyof AutofillData>(
  key: T,
) => AutofillData[T] | null;

const AutofillContext = createContext<{
  setValue: setValue;
  getValue: getValue;
  createTCN: () => string;
  subscribe: Subscribe;
  getState: () => AutofillData;
}>({
  setValue: () => {},
  getValue: () => null,
  createTCN: () => "",
  subscribe: () => () => {},
  getState: () => ({}) as AutofillData,
});

export const useAutofill = () => useContext(AutofillContext);

export const useAutofillValue = <T extends keyof AutofillData>(key: T) => {
  const { getValue } = useAutofill();
  return getValue(key);
};

export const AutofillProvider = ({ children }: PropsWithChildren) => {
  const valueRef = useRef<AutofillData>({
    biographics: {
      firstName: "",
      lastName: "",
      dob: "",
      sex: "",
      race: "",
      citizenship: "",
      birthCountry: "",
      eyeColor: "",
      collectionReason: "",
      hairColor: "",
      documents: [],
    },
    submissionSettings: {
      ori: "",
      oan: "",
      dai: "",
      dan: "",
      cai: "",
      activityTerminal: "",
      on: "",
      ou: "",
      osu: "",
      activitySiteId: "",
      activityCategory: "",
    },
    transactions: [],
    appSettings: {
      retainLogsDays: 100,
      retainSubmissionsDays: 100,
      contactlessAdministered: true,
      fingerprintCaptureSequence: "tenFlat",
    },
  });

  const listenersRef = useRef(new Set<() => void>());
  const notify = useCallback(() => {
    for (const l of listenersRef.current) l();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("autofill").then((v) => {
      if (v) {
        const savedData = JSON.parse(v) as AutofillData;
        valueRef.current = savedData;
        notify();
      }
    });
  }, [notify]);

  const setValue: setValue = useCallback(
    (key, value) => {
      valueRef.current[key] = value;
      AsyncStorage.setItem("autofill", JSON.stringify(valueRef.current)).catch(
        (e) => {
          console.error("Failed to save autofill data", e);
        },
      );
      notify();
    },
    [notify],
  );

  const getValue: getValue = useCallback((key) => valueRef.current[key], []);

  const createTCN = useCallback(() => {
    const submissionSettings = getValue("submissionSettings");

    if (!submissionSettings) throw new Error("Submission settings not set");

    return `${submissionSettings.ori}-${format(
      new Date(),
      "yyyyMMddHHmmss",
    )}-${submissionSettings.oan}-${Math.floor(Math.random() * 10000)}-${Math.floor(
      Math.random() * 100000,
    )}`;
  }, [getValue]);

  const subscribe: Subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getState = useCallback(() => valueRef.current, []);

  return (
    <AutofillContext.Provider
      value={{ setValue, getValue, createTCN, subscribe, getState }}
    >
      {children}
    </AutofillContext.Provider>
  );
};
