import * as SecureStore from "expo-secure-store";

/**
 * The export passcode (4 to 6 digits), as on Android: it has to be entered
 * before any transaction is exported. Kept in the iOS Keychain.
 */
const KEY_NAME = "iwExportPasscode";

export const isValidPasscode = (value: string) => /^\d{4,6}$/.test(value);

export const hasExportPasscode = async () =>
  !!(await SecureStore.getItemAsync(KEY_NAME));

export const saveExportPasscode = (passcode: string) =>
  SecureStore.setItemAsync(KEY_NAME, passcode);

export const checkExportPasscode = async (passcode: string) =>
  (await SecureStore.getItemAsync(KEY_NAME)) === passcode;

const clearedListeners = new Set<() => void>();

/** Calls back when the passcode is removed, so setup can be shown again. */
export const watchPasscodeCleared = (listener: () => void) => {
  clearedListeners.add(listener);
  return () => {
    clearedListeners.delete(listener);
  };
};

/** Removes the passcode (Clear Secure Data); a new one must then be created. */
export const clearExportPasscode = async () => {
  await SecureStore.deleteItemAsync(KEY_NAME);
  clearedListeners.forEach((listener) => listener());
};
