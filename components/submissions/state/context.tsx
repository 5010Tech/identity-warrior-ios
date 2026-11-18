import { useAsyncReducer } from "@/components/useAsyncReducer";
import { Transaction } from "@/types";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  addSubmissionAction,
  populateSubmissionsAction,
  resendSubmissionsAction,
} from "./actions";
import { submissionsReducer } from "./reducer";
import { SubmissionItem } from "../types";
import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { DELETE_SUBMISSION } from "./actionTypes";

interface SubmissionActionContextValue {
  addSubmission: (transaction: Transaction) => Promise<void>;
  resendSubmissions: () => Promise<void>;
  deleteSubmission: (tcn: string) => void;
}

const SubmissionActionContext = createContext<SubmissionActionContextValue>({
  addSubmission: (transaction: Transaction) => {
    throw new Error("Function not implemented.");
  },
  resendSubmissions: () => {
    throw new Error("Function not implemented.");
  },
  deleteSubmission: function (tcn: string): void {
    throw new Error("Function not implemented.");
  },
});

const SubmissionValueContext = createContext<SubmissionItem[]>([]);

export const useSubmissionValue = () => useContext(SubmissionValueContext);

export const useSubmissionActions = () => useContext(SubmissionActionContext);

export const SubmissionProvider = ({ children }: PropsWithChildren) => {
  const [submissions, dispatch] = useAsyncReducer(submissionsReducer, []);
  const { getValue } = useAutofill();

  useEffect(() => {
    dispatch(populateSubmissionsAction);
  }, [dispatch]);

  const addSubmission: SubmissionActionContextValue["addSubmission"] =
    useCallback(
      async (transaction) => await dispatch(addSubmissionAction(transaction)),
      [dispatch],
    );

  const abortControllerRef = useRef<AbortController | null>(null);
  const resendSubmissions: SubmissionActionContextValue["resendSubmissions"] =
    useCallback(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      dispatch(
        resendSubmissionsAction(
          getValue("appSettings")?.retainLogsDays || 100,
          abortControllerRef.current.signal,
        ),
      );
    }, [dispatch, getValue]);

  const deleteSubmission = useCallback(
    (tcn: string) => {
      dispatch({
        type: DELETE_SUBMISSION,
        payload: tcn,
      });
    },
    [dispatch],
  );

  const actions = useMemo(() => {
    return {
      addSubmission,
      resendSubmissions,
      deleteSubmission,
    };
  }, [addSubmission, resendSubmissions, deleteSubmission]);

  return (
    <SubmissionValueContext.Provider value={submissions}>
      <SubmissionActionContext.Provider value={actions}>
        {children}
      </SubmissionActionContext.Provider>
    </SubmissionValueContext.Provider>
  );
};
