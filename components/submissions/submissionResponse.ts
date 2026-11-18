import { SubmissionItem } from "./types";

export const transientNoMatchPollWindowMs = 2 * 60 * 60 * 1000;

const capitalizeFirst = (value: string) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

const parseIsoDate = (value?: string | null) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const isSubmissionPendingRemark = (remark?: string | null) =>
  Boolean(remark?.trim().match(/^(created|queued|pending|processing)$/i));

export const extractSubmissionErrorReason = (remark?: string | null) => {
  if (!remark) return undefined;

  const lines = remark
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const codedErrorLine = [...lines]
    .reverse()
    .find((line) => /^[A-Z]{2,}-\d+\s*:\s*.+$/i.test(line));

  if (codedErrorLine) {
    return capitalizeFirst(
      codedErrorLine.replace(/^[A-Z]{2,}-\d+\s*:\s*/i, "").trim(),
    );
  }

  if (
    /encountered an error|error processing|exception| failed\b/i.test(remark)
  ) {
    const lastLine = lines[lines.length - 1] ?? remark.trim();
    const withoutPrefix = lastLine.includes(":")
      ? lastLine.slice(lastLine.indexOf(":") + 1).trim()
      : lastLine;

    return capitalizeFirst(withoutPrefix || lastLine.trim());
  }

  return undefined;
};

export const isTransientNoMatchResponse = (
  response?: Pick<
    SubmissionItem,
    "remark" | "sensors" | "responseErrorReason"
  > | null,
) => {
  if (!response) return false;
  if (response.responseErrorReason) return false;

  return Boolean(
    !response.sensors?.length && response.remark?.match(/\bno\s+match\b/i),
  );
};

export const getNoMatchPollingState = (
  submission: Pick<
    SubmissionItem,
    "noMatchPollingStartedAt" | "lastResponseFetchAt"
  >,
  now: number = Date.now(),
) => {
  const start = parseIsoDate(submission.noMatchPollingStartedAt);

  if (start == null) {
    return {
      withinWindow: false,
      shouldFinalCheck: false,
      deadline: null as number | null,
    };
  }

  const deadline = start + transientNoMatchPollWindowMs;
  const lastFetchAt = parseIsoDate(submission.lastResponseFetchAt);

  return {
    withinWindow: now <= deadline,
    shouldFinalCheck:
      now > deadline && (lastFetchAt == null || lastFetchAt <= deadline),
    deadline,
  };
};
