import AsyncStorage from "@react-native-async-storage/async-storage";

type Storage = {
  flushGetRequests: () => void;
  getAllKeys: () => void;
  getItem: (key: string, defaultValue: string | null) => Promise<string | null>;
  multiGet: (keys: readonly string[]) => Promise<[string, string][]>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

export const useStorage = (): Storage => {
  return {
    flushGetRequests: () => AsyncStorage.flushGetRequests(),

    getAllKeys: () => AsyncStorage.getAllKeys(),

    getItem: async (key: string, defaultValue: string | null) => {
      const value = await AsyncStorage.getItem(key);

      if (!value) {
        return defaultValue;
      }

      return JSON.parse(value);
    },

    multiGet: (keys: readonly string[]) =>
      AsyncStorage.multiGet(keys).then(
        (result) => result as [string, string][],
      ),

    removeItem: (key: string) => AsyncStorage.removeItem(key),

    setItem: async (key: string, value: string) => {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    },
  };
};
