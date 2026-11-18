import { asyncAction } from "@/components/useAsyncReducer";
import { FaceDTO, Finger, Iris, Transaction } from "@/types";
import {
  deleteFileOrDirectory,
  getBase64Image,
  saveBase64Image,
} from "@/util/fs";
import { APIClient } from "@/util/server/APIClient";
import { buildApiTransaction } from "@/util/server/transactionPayload";
import {
  extractSubmissionErrorReason,
  getNoMatchPollingState,
  isSubmissionPendingRemark,
  isTransientNoMatchResponse,
} from "../submissionResponse";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getNetworkStateAsync } from "expo-network";
import { router } from "expo-router";
import { Alert } from "react-native";
import { SubmissionItem } from "../types";
import {
  ADD_SUBMISSION,
  POPULATE_SUBMISSIONS,
  SET_SUBMISSIONS,
  SUBMISSION_REQUESTED,
} from "./actionTypes";

const confirmationRetryMs = 15000;

const isLocalFileUri = (value?: string) =>
  Boolean(value?.startsWith("file://"));

const sanitizeFileName = (value: string) =>
  value.replace(/[^a-zA-Z0-9._-]+/g, "_");

const getFaceStorageKey = (face: FaceDTO, index: number) => {
  const fallback =
    [face.type, face.pose, String(index)].filter(Boolean).join("-") ||
    `face-${index}`;
  return sanitizeFileName(face.referenceId ?? fallback);
};

const getFingerStorageKey = (finger: Finger, index: number) =>
  sanitizeFileName(finger.referenceId ?? `${finger.fingerPosition}-${index}`);

const getIrisStorageKey = (iris: Iris, index: number) =>
  sanitizeFileName(iris.referenceId ?? `${iris.eyePosition}-${index}`);

const persistImage = async (image: string | undefined, filePath: string) => {
  if (!image) return image;
  if (isLocalFileUri(image)) return image;
  return saveBase64Image(image, filePath);
};

const resolveImage = async (image?: string) => {
  if (!image) return image;
  if (!isLocalFileUri(image)) return image;
  return getBase64Image(image);
};

const stageTransaction = async (
  transaction: Transaction,
): Promise<Transaction> => ({
  ...transaction,
  faces: await Promise.all(
    transaction.faces.map(async (face, index) => ({
      ...face,
      image: await persistImage(
        face.image,
        `submissions/${transaction.tcn}/faces/${getFaceStorageKey(face, index)}.txt`,
      ),
    })),
  ),
  fingers: await Promise.all(
    transaction.fingers.map(async (finger, index) => ({
      ...finger,
      image: await persistImage(
        finger.image,
        `submissions/${transaction.tcn}/fingers/${getFingerStorageKey(finger, index)}.txt`,
      ),
    })),
  ),
  irises: await Promise.all(
    transaction.irises.map(async (iris, index) => ({
      ...iris,
      image: await persistImage(
        iris.image,
        `submissions/${transaction.tcn}/irises/${getIrisStorageKey(iris, index)}.txt`,
      ),
    })),
  ),
});

const hydrateTransaction = async (
  submission: Pick<SubmissionItem, "faces" | "fingers" | "irises"> &
    Transaction,
): Promise<Transaction> => ({
  ...submission,
  faces: await Promise.all(
    submission.faces.map(async (face) => ({
      ...face,
      image: await resolveImage(face.image),
    })),
  ),
  fingers: await Promise.all(
    submission.fingers.map(async (finger) => ({
      ...finger,
      image: await resolveImage(finger.image),
    })),
  ),
  irises: await Promise.all(
    submission.irises.map(async (iris) => ({
      ...iris,
      image: await resolveImage(iris.image),
    })),
  ),
});

const persistThumbnail = async (
  face: FaceDTO | undefined,
  filePath: string,
): Promise<FaceDTO | undefined> => {
  if (!face) return face;
  const image = await resolveImage(face.image);

  return {
    ...face,
    image: await persistImage(image, filePath),
  };
};

const hasReceivedResponse = (submission: Partial<SubmissionItem>) =>
  Boolean(
    submission.dateTime ||
    submission.remark ||
    submission.sensors?.length ||
    submission.responseErrorReason,
  );

const shouldRefreshResponse = (submission: SubmissionItem) => {
  if (submission.failed) return false;
  if (submission.awaitingConfirmation) return true;

  const noMatchPolling = getNoMatchPollingState(submission);
  if (noMatchPolling.withinWindow || noMatchPolling.shouldFinalCheck) {
    return true;
  }

  if (submission.pending) return true;

  return (
    Boolean(submission.submissionAttempts) && !hasReceivedResponse(submission)
  );
};

const shouldAttemptSubmit = (submission: SubmissionItem) => {
  if (submission.failed) return true;
  if (!submission.awaitingConfirmation) return false;
  if (!submission.lastSubmissionAttemptAt) return true;

  return (
    Date.now() - new Date(submission.lastSubmissionAttemptAt).getTime() >=
    confirmationRetryMs
  );
};

const markSubmissionQueued = (
  submission: SubmissionItem,
  attemptsDelta: number,
): SubmissionItem => ({
  ...submission,
  failed: false,
  pending: true,
  awaitingConfirmation: true,
  error: undefined,
  submissionAttempts: (submission.submissionAttempts ?? 0) + attemptsDelta,
  lastSubmissionAttemptAt: new Date().toISOString(),
});

const markSubmissionFailed = (
  submission: SubmissionItem,
  error: unknown,
): SubmissionItem => ({
  ...submission,
  failed: true,
  pending: false,
  awaitingConfirmation: false,
  error,
});

const mergeSubmissionResponse = (
  submission: SubmissionItem,
  response: Partial<SubmissionItem>,
): SubmissionItem => {
  const mergedResponse = {
    ...response,
    sensors: response.sensors ?? [],
  };
  const responseErrorReason = extractSubmissionErrorReason(
    mergedResponse.remark,
  );
  const fetchedAt = new Date().toISOString();

  if (isTransientNoMatchResponse({ ...mergedResponse, responseErrorReason })) {
    const noMatchPollingStartedAt =
      submission.noMatchPollingStartedAt ?? fetchedAt;
    const noMatchPolling = getNoMatchPollingState(
      {
        noMatchPollingStartedAt,
        lastResponseFetchAt: fetchedAt,
      },
      Date.now(),
    );

    return {
      ...submission,
      ...mergedResponse,
      error: undefined,
      failed: false,
      pending: noMatchPolling.withinWindow,
      awaitingConfirmation: false,
      lastResponseFetchAt: fetchedAt,
      noMatchPollingStartedAt: noMatchPolling.withinWindow
        ? noMatchPollingStartedAt
        : undefined,
      responseErrorReason: undefined,
    };
  }

  return {
    ...submission,
    ...mergedResponse,
    error: undefined,
    failed: false,
    pending: isSubmissionPendingRemark(mergedResponse.remark),
    awaitingConfirmation: false,
    lastResponseFetchAt: fetchedAt,
    noMatchPollingStartedAt: undefined,
    responseErrorReason,
  };
};

const clearSubmissionPayloadFiles = async (tcn: string) => {
  await deleteFileOrDirectory(`submissions/${tcn}/faces/`);
  await deleteFileOrDirectory(`submissions/${tcn}/fingers/`);
  await deleteFileOrDirectory(`submissions/${tcn}/irises/`);
};

const submitStagedTransaction = async (
  submission: SubmissionItem,
  signal?: AbortSignal,
) => {
  const transaction = await hydrateTransaction(submission);
  const response = await APIClient.POST(
    "jsonixm/requests",
    buildApiTransaction(transaction),
    { signal },
  );

  if (!response?.success) {
    throw new Error(
      response?.message || "Submission request was not accepted.",
    );
  }
};

const fetchSubmissionResponse = async (
  tcn: string,
  signal?: AbortSignal,
): Promise<Partial<SubmissionItem> | null> => {
  try {
    return await APIClient.GET(`jsonixm/responses/${tcn}`, { signal });
  } catch (error) {
    if ((error as any)?.cause?.status === 404) {
      return null;
    }
    throw error;
  }
};

const buildInitialSubmission = async (
  transaction: Transaction,
): Promise<SubmissionItem> => {
  const stagedTransaction = await stageTransaction(transaction);
  const thumbnailSource = stagedTransaction.faces.find(({ pose, type }) =>
    transaction.tot === "Compare" ? type === "probe" : pose === "F",
  );
  const thumbnailReferenceSource =
    transaction.tot === "Compare"
      ? stagedTransaction.faces.find(({ type }) => type === "reference")
      : undefined;

  return {
    ...stagedTransaction,
    failed: true,
    pending: false,
    awaitingConfirmation: false,
    submissionAttempts: 0,
    thumbnail: await persistThumbnail(
      thumbnailSource,
      `submissions/${transaction.tcn}/thumbnail.txt`,
    ),
    thumbnailReference: await persistThumbnail(
      thumbnailReferenceSource,
      `submissions/${transaction.tcn}/thumbnailReference.txt`,
    ),
  };
};

export const addSubmissionAction =
  (transaction: Transaction): asyncAction =>
  async (dispatch) => {
    let submitError: unknown;

    try {
      let submission = await buildInitialSubmission(transaction);
      const { isInternetReachable } = await getNetworkStateAsync();

      if (isInternetReachable) {
        try {
          await submitStagedTransaction(submission);
          submission = markSubmissionQueued(submission, 1);

          const response = await fetchSubmissionResponse(transaction.tcn);
          if (response) {
            submission = mergeSubmissionResponse(submission, response);
            if (!submission.pending) {
              await clearSubmissionPayloadFiles(transaction.tcn);
            }
          }
        } catch (error) {
          submitError = error;
          submission = markSubmissionFailed(submission, error);
          console.error(error);
        }
      }

      dispatch({ type: ADD_SUBMISSION, payload: submission });
      router.back();

      if (submitError) {
        Alert.alert(
          "Request Saved Locally",
          "We couldn't confirm the submission with the API, so the transaction was kept on the device and will be retried on refresh.",
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Request Failed",
        "We couldn't prepare your request for submission. Would you like to review your API settings to ensure everything is configured correctly?",
        [
          {
            text: "API Settings",
            onPress: () => router.navigate("/apiSettings"),
          },
          { text: "Cancel", style: "cancel" },
        ],
        { cancelable: true },
      );
      throw error;
    }
  };

export const populateSubmissionsAction: asyncAction = async (dispatch) => {
  const submissions = await AsyncStorage.getItem("submissions");
  console.log(
    JSON.stringify(
      { submissions },
      (k, v) => (typeof v === "string" ? v.slice(0, 100) : v),
      2,
    ),
  );
  submissions &&
    dispatch({ type: POPULATE_SUBMISSIONS, payload: JSON.parse(submissions) });
};

export const resendSubmissionsAction: (
  retainLogsDays: number,
  signal: AbortSignal,
) => asyncAction =
  (retainLogsDays: number, signal: AbortSignal) =>
  async (dispatch, getState) => {
    const { isInternetReachable } = await getNetworkStateAsync();
    if (!isInternetReachable) {
      return;
    }

    const cutoff = new Date(Date.now() - retainLogsDays * 24 * 60 * 60 * 1000);
    const currentState = getState<SubmissionItem[]>();
    const eligibleSubmissions = currentState
      .map((submission, index) => ({ submission, index }))
      .filter(
        ({ submission }) =>
          new Date(submission.transactionDate ?? Date.now()) > cutoff,
      );

    const updatedSubmissions = await Promise.all(
      eligibleSubmissions.map(
        async ({ submission: originalSubmission, index }) => {
          let submission = originalSubmission;

          if (shouldAttemptSubmit(submission)) {
            dispatch({ type: SUBMISSION_REQUESTED, payload: index });
            try {
              await submitStagedTransaction(submission, signal);
              submission = markSubmissionQueued(submission, 1);
            } catch (error) {
              console.error(error);
              return {
                index,
                submission: markSubmissionFailed(submission, error),
              };
            }
          }

          if (!shouldRefreshResponse(submission)) {
            return { index, submission };
          }

          dispatch({ type: SUBMISSION_REQUESTED, payload: index });
          try {
            const response = await fetchSubmissionResponse(
              submission.tcn,
              signal,
            );
            if (!response) {
              const fetchedAt = new Date().toISOString();
              const noMatchPolling = getNoMatchPollingState(
                {
                  noMatchPollingStartedAt: submission.noMatchPollingStartedAt,
                  lastResponseFetchAt: fetchedAt,
                },
                Date.now(),
              );

              return {
                index,
                submission: {
                  ...submission,
                  pending: submission.awaitingConfirmation
                    ? true
                    : submission.noMatchPollingStartedAt
                      ? noMatchPolling.withinWindow
                      : submission.pending,
                  lastResponseFetchAt: fetchedAt,
                  noMatchPollingStartedAt: submission.noMatchPollingStartedAt
                    ? noMatchPolling.withinWindow
                      ? submission.noMatchPollingStartedAt
                      : undefined
                    : submission.noMatchPollingStartedAt,
                },
              };
            }

            const merged = mergeSubmissionResponse(submission, response);
            if (!merged.pending) {
              await clearSubmissionPayloadFiles(merged.tcn);
            }

            return { index, submission: merged };
          } catch (error) {
            console.error(error);
            return {
              index,
              submission: {
                ...submission,
                error,
              },
            };
          }
        },
      ),
    );

    const updatesByIndex = new Map(
      updatedSubmissions.map(({ index, submission }) => [index, submission]),
    );

    dispatch({
      type: SET_SUBMISSIONS,
      payload: currentState.map((submission, index) => {
        const updated = updatesByIndex.get(index);
        return updated ? { ...updated, fetching: undefined } : submission;
      }),
    });
  };
