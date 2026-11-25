import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * How often each value has been picked in each select list, so the pickers can
 * show the most used values first (the Android app's SelectionCounts). Kept per
 * list ("type", e.g. the field name) and value, on this device only.
 */
const STORAGE_KEY = "iwSelectCounts";

let counts: Record<string, number> = {};

// Loaded once at start-up; a picker opened before this finishes simply shows
// the list in its normal order.
AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if (saved) counts = { ...JSON.parse(saved), ...counts };
  })
  .catch((e) => console.warn("Could not load selection counts", e));

const key = (type: string, value: unknown) => `${type}|${String(value)}`;

/** Counts one more pick of `value` in the `type` list. */
export const countSelection = (type: string | undefined, value: unknown) => {
  if (!type || value === "" || value == null) return;
  counts[key(type, value)] = (counts[key(type, value)] ?? 0) + 1;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(counts)).catch((e) =>
    console.warn("Could not save selection counts", e),
  );
};

/**
 * The order to show a list in: most picked first; values picked equally often
 * (including never) keep their original order.
 */
export const orderBySelectionCount = <T extends { value: unknown }>(
  type: string | undefined,
  items: T[],
): T[] => {
  if (!type) return items;
  return items
    .map((item, index) => ({
      item,
      index,
      count: counts[key(type, item.value)] ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map(({ item }) => item);
};
