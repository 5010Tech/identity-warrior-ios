import { DispatchAction } from "@/types";
import { SubmissionItem } from "../types";
import {
  ADD_SUBMISSION,
  DELETE_SUBMISSION,
  POPULATE_SUBMISSIONS,
  SET_SUBMISSIONS,
  SUBMISSION_REQUESTED,
} from "./actionTypes";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteFileOrDirectory } from "@/util/fs";

export const submissionsReducer = (
  state: SubmissionItem[] = [],
  { type, payload }: DispatchAction<any>,
): SubmissionItem[] => {
  switch (type) {
    case POPULATE_SUBMISSIONS:
      return payload;
    case SET_SUBMISSIONS:
      const subSet = new Set(
        payload.map((submission: SubmissionItem) => submission.tcn),
      );
      state.forEach((submission) => {
        if (!subSet.has(submission.tcn)) {
          deleteFileOrDirectory(`submissions/${submission.tcn}`);
        }
      });
      AsyncStorage.setItem("submissions", JSON.stringify(payload));
      return payload;

    case ADD_SUBMISSION:
      AsyncStorage.setItem("submissions", JSON.stringify([payload, ...state]));
      return [payload, ...state];

    case SUBMISSION_REQUESTED:
      return [
        ...state.slice(0, payload),
        { ...state[payload], fetching: true },
        ...state.slice(payload + 1),
      ];
    case DELETE_SUBMISSION:
      const newSubmissions = state.filter((submission) => {
        if (submission.tcn !== payload) {
          return true;
        } else {
          deleteFileOrDirectory(`submissions/${submission.tcn}`);
          return false;
        }
      });
      AsyncStorage.setItem("submissions", JSON.stringify(newSubmissions));
      return newSubmissions;
    default:
      return state;
  }
};
