import { AutofillData } from "@/components/autofill/context/AutofillContext";
import { CollectionMode } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Reads the saved collection mode (App Settings) straight from storage, for code
 * that runs outside the settings context, such as app start-up and the API client.
 * DoD when nothing has been saved yet.
 */
export async function getSavedCollectionMode(): Promise<CollectionMode> {
  try {
    const saved = await AsyncStorage.getItem("autofill");
    if (saved) {
      const data = JSON.parse(saved) as Partial<AutofillData>;
      if (data.appSettings?.collectionMode === "DHS") return "DHS";
    }
  } catch (e) {
    console.error("Failed to read collection mode", e);
  }
  return "DOD";
}
