import { ExpoIdentifi } from "@/modules/expo-identifi";
import { useCallback, useState } from "react";
import { useActiveDevice } from "../device/activeDevice";

export const useIdentiFICapture = () => {
  const [isCapturing, setIsCapturing] = useState(false);

  const { activeDevice } = useActiveDevice();

  return {
    isCapturing,
  };
};
