import { FingerType } from "@/modules/slapshot-capture-library/src";
import { NestedKeyOf } from "@/types";
import { TransactionType } from "@/types/Transaction";
import { getFieldOperations } from "@/util/fieldOperations";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { CaptureState } from "../types";
import {
  hasCollected,
  loadRecovery,
  saveRecovery,
  suspendRecovery,
  takeRequestedRecovery,
} from "../recovery";
import { captureReducer } from "./reducer";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const initializer = (tot: TransactionType): CaptureState => ({
  fetching: [],
  transaction: {
    tot: tot,
    transactionDate: new Date(),
    ori: "",
    oan: "",
    dai: "",
    dan: "",
    cai: "",
    activityTerminal: "",
    geoLocation: "",
    tcn: "",
    applicationName: "",
    applicationVersion: "",
    biographicData: {
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
      mnuType: "",
      mnu: "",
      dnaId: "",
      dnaSystem: "",
    },
    faces: [],
    fingers: [],
    irises: [],
    on: "",
    ou: "",
    osu: "",
    activitySiteId: "",
    activityCategory: "",
  },
  rolledFingers: [],
  slaps: {},
  pngRolledFingers: {},
  pngFingers: {
    [FingerType.UNKNOWN]: "",
    [FingerType.RT]: "",
    [FingerType.RI]: "",
    [FingerType.RM]: "",
    [FingerType.RR]: "",
    [FingerType.RL]: "",
    [FingerType.LT]: "",
    [FingerType.LI]: "",
    [FingerType.LM]: "",
    [FingerType.LR]: "",
    [FingerType.LL]: "",
    [FingerType.PRT]: "",
    [FingerType.PLT]: "",
    [FingerType.R4FS]: "",
    [FingerType.L4FS]: "",
    [FingerType.TS]: "",
    [FingerType.RFP]: "",
    [FingerType.RWP]: "",
    [FingerType.LFP]: "",
    [FingerType.LWP]: "",
  },
  smts: [],
  palms: [],
  biographicsEnabled: true,
  faceEnabled: true,
  fingersEnabled: true,
  irisEnabled: false,
});

export const CaptureDataContext = createContext<CaptureState>(
  initializer("Enroll"),
);

export type GetValueFn = <T>(name: NestedKeyOf<CaptureState>) => T;
export type SetValueFn = <T>(name: NestedKeyOf<CaptureState>, value: T) => void;
export type SetEnabledFn = (
  name: "fingersEnabled" | "faceEnabled" | "biographicsEnabled" | "irisEnabled",
  enabled: boolean,
) => void;

export const CaptureActionsContext = createContext<{
  takeSnapshot: (name: NestedKeyOf<CaptureState>) => void;
  restoreSnapshot: (name: NestedKeyOf<CaptureState>) => void;
  getValue: GetValueFn;
  setValue: SetValueFn;
  setEnabled: SetEnabledFn;
}>({
  setValue: function <T>(name: NestedKeyOf<CaptureState>, value: T): void {
    throw new Error("Function not implemented.");
  },
  takeSnapshot: function (name: NestedKeyOf<CaptureState>): void {
    throw new Error("Function not implemented.");
  },
  restoreSnapshot: function (name: NestedKeyOf<CaptureState>): void {
    throw new Error("Function not implemented.");
  },
  getValue: function <T>(name: NestedKeyOf<CaptureState>): T {
    throw new Error("Function not implemented.");
  },
  setEnabled: function (
    name:
      | "fingersEnabled"
      | "faceEnabled"
      | "biographicsEnabled"
      | "irisEnabled",
    enabled: boolean,
  ): void {
    throw new Error("Function not implemented.");
  },
});

export const CaptureProvider = ({ children }: PropsWithChildren) => {
  const { transactionType } = useLocalSearchParams<{
    transactionType: TransactionType;
  }>();

  const [state, dispatch] = useReducer(
    captureReducer,
    transactionType,
    initializer,
  );

  const stateRef = useRef<CaptureState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const snapshot = useRef<CaptureState>(state);

  const takeSnapshot = useCallback((name: NestedKeyOf<CaptureState>) => {
    const latestState = stateRef.current;
    const currentSnapshot = snapshot.current;

    const valueToCopy = getFieldOperations(name, latestState).value;

    snapshot.current = getFieldOperations(name, currentSnapshot).setValue(
      valueToCopy,
    );
  }, []);

  const restoreSnapshot = useCallback((name: NestedKeyOf<CaptureState>) => {
    dispatch({
      name,
      method: "setValue",
      args: [getFieldOperations(name, snapshot.current).value],
    });
  }, []);

  const getValue = useCallback<GetValueFn>((name) => {
    return getFieldOperations(name, stateRef.current).value;
  }, []);

  const setValue = useCallback<SetValueFn>((name, value) => {
    console.log(
      "setValue",
      name,
      JSON.stringify(value, (k, v) =>
        typeof v === "string" ? v.slice(0, 100) : v,
      ),
    );
    dispatch({
      name,
      method: "setValue",
      args: [value],
    });
  }, []);

  const setEnabled = useCallback(
    (
      name:
        | "fingersEnabled"
        | "faceEnabled"
        | "biographicsEnabled"
        | "irisEnabled",
      enabled: boolean,
    ) => {
      setValue(name, enabled);
      AsyncStorage.setItem(
        `capture.${getValue("transaction.tot")}.${name}`,
        JSON.stringify(enabled),
      );
    },
    [getValue, setValue],
  );

  // The collection the operator chose to recover: its data replaces the
  // empty state these screens start with.
  useEffect(() => {
    // A new collection: saving is on again (it stops once one is submitted).
    suspendRecovery(false);
    if (!takeRequestedRecovery()) return;
    let alive = true;
    dispatch({ name: "restoring", method: "setValue", args: [true] });
    // Each part lands as soon as it is unsealed: the collection screen shows
    // what has been collected without waiting for every image.
    loadRecovery((name, value) => {
      if (!alive) return;
      dispatch({
        name: name as NestedKeyOf<CaptureState>,
        method: "setValue",
        args: [value],
      });
    }).finally(() => {
      if (alive) {
        dispatch({ name: "restoring", method: "setValue", args: [false] });
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // Everything collected is kept on the phone as it comes in, so a crash or
  // an operator who leaves the app does not lose it (Android's
  // saveForRecovery). Saving waits for a pause in the collection.
  useEffect(() => {
    if (!hasCollected(state)) return;
    const timer = setTimeout(() => {
      void saveRecovery(state, state.transaction?.tot ?? transactionType);
    }, 1200);
    return () => clearTimeout(timer);
  }, [state, transactionType]);

  useEffect(() => {
    const fetchEnabled = async () => {
      const biographicsEnabled = AsyncStorage.getItem(
        `capture.${getValue("transaction.tot")}.biographicsEnabled`,
      );
      const faceEnabled = AsyncStorage.getItem(
        `capture.${getValue("transaction.tot")}.faceEnabled`,
      );
      const fingersEnabled = AsyncStorage.getItem(
        `capture.${getValue("transaction.tot")}.fingersEnabled`,
      );
      const irisEnabled = AsyncStorage.getItem(
        `capture.${getValue("transaction.tot")}.irisEnabled`,
      );

      setValue("biographicsEnabled", (await biographicsEnabled) !== "false");
      setValue("faceEnabled", (await faceEnabled) !== "false");
      setValue("fingersEnabled", (await fingersEnabled) !== "false");
      setValue("irisEnabled", (await irisEnabled) === "true");
    };

    fetchEnabled();
  }, [getValue, setValue]);

  const actions = useMemo(() => {
    return {
      setValue,
      takeSnapshot,
      restoreSnapshot,
      getValue,
      setEnabled,
    };
  }, [setValue, takeSnapshot, restoreSnapshot, getValue, setEnabled]);
  return (
    <CaptureActionsContext.Provider value={actions}>
      <CaptureDataContext.Provider value={state}>
        {children}
      </CaptureDataContext.Provider>
    </CaptureActionsContext.Provider>
  );
};
