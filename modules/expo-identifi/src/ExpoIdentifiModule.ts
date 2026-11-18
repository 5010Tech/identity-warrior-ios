import { Base64Image, fingerprintCaptureSequence, NFIQScore } from "@/types";
import { withTimeout } from "@/util/withTimeout";
import { requireNativeModule } from "expo-modules-core";

const ExpoIdentifi = requireNativeModule("ExpoIdentifi");

export interface IrisCaptureResult {
  leftImage: Base64Image;
  rightImage: Base64Image;
  leftTotalScore: number;
  leftUsableArea: number;
  rightTotalScore: number;
  rightUsableArea: number;
  imageHeight?: number;
  imageWidth?: number;
  horizontalPixelDensity?: number;
  verticalPixelDensity?: number;
  imageBitsPerPixelQuantity?: number;
}

export interface IrisCaptureStatusEvent {
  irisCaptureStatus: number;
}

export interface IrisPreviewFrameEvent {}

const connect = async () => {
  try {
    return await ExpoIdentifi.connect();
  } catch (error) {
    console.error("Failed to connect to device", error);
    throw error;
  }
};

const disconnect = async () => {
  try {
    return await withTimeout(ExpoIdentifi.disconnect(), 5000);
  } catch (error) {
    console.error("Failed to disconnect from device", error);
    throw error;
  }
};

const captureFingerprints = async (
  fingerAmount: 1 | 2 | 4 = 1,
  savedAtIndex: number = -1,
  fingerprintCaptureSequence?: fingerprintCaptureSequence,
): Promise<{ raw: Base64Image; image: Base64Image }> => {
  try {
    if (fingerprintCaptureSequence === "tenRolled") {
      return await ExpoIdentifi.startCaptureRollFinger(savedAtIndex);
    }
    const methods = {
      1: ExpoIdentifi.startCaptureOneFinger,
      2: ExpoIdentifi.startCaptureTwoFinger,
      4: ExpoIdentifi.startCaptureFourFinger,
    };
    return await methods[fingerAmount](savedAtIndex);
  } catch (error) {
    console.error("Failed to capture fingerprints", error);
    throw error;
  }
};

const stopCapture = async () => {
  try {
    return await withTimeout(ExpoIdentifi.cancelFpCapture(), 5000);
  } catch (error) {
    console.error("Failed to stop capture", error);
    throw error;
  }
};

const getDeviceInfo = async () => {
  try {
    const doGetdeviceInfo = async () => ({
      serialNumber: await ExpoIdentifi.getDeviceSerialNumber(),
      modelNumber: await ExpoIdentifi.getModelNumber(),
    });
    return await withTimeout(doGetdeviceInfo(), 5000);
  } catch (error) {
    console.error("Failed to get device info", error);
    throw error;
  }
};

const clearMemoryBuffer = async (savedAtIndex = -1) => {
  try {
    console.log("Clearing memory buffer at index", savedAtIndex);
    return await ExpoIdentifi.clearSavedFpImages(savedAtIndex);
  } catch (error) {
    console.error("Failed to clear memory buffer", error);
    throw error;
  }
};

const setMinimumNFIQScore = async (nfiq: NFIQScore) => {
  try {
    console.log("Setting minimum NFIQ score to", nfiq);
    return await withTimeout(ExpoIdentifi.setMinimumNFIQScore(nfiq), 5000);
  } catch (error) {
    console.error("Failed to set minimum NFIQ score", error);
    throw error;
  }
};

const getNFIQScore = async (savedAtIndex: number): Promise<NFIQScore> => {
  try {
    return Number(
      await withTimeout(ExpoIdentifi.getNFIQScore(savedAtIndex), 5000),
    );
  } catch (error) {
    console.error("Failed to get NFIQ score", error);
    throw error;
  }
};

const getSegmentedImage = async (
  savedAtIndex: number,
): Promise<Base64Image> => {
  try {
    return await withTimeout(
      ExpoIdentifi.getSegmentedFpImage(savedAtIndex),
      5000,
    );
  } catch (error) {
    console.error("Failed to get segmented image", error);
    throw error;
  }
};

const getWSQImage = async (savedAtIndex: number): Promise<Base64Image> => {
  try {
    return await withTimeout(
      ExpoIdentifi.getWSQEncodedFpImageFromImageSavedAt(savedAtIndex),
      5000,
    );
  } catch (error) {
    console.error("Failed to get WSQ image", error);
    throw error;
  }
};

const getIrisPowerStatus = async (): Promise<boolean> => {
  try {
    return Boolean(await withTimeout(ExpoIdentifi.getIrisPowerStatus(), 5000));
  } catch (error) {
    console.error("Failed to get iris power status", error);
    throw error;
  }
};

const setIrisPowerOn = async (): Promise<boolean> => {
  try {
    return Boolean(await withTimeout(ExpoIdentifi.setIrisPowerOn(), 30000));
  } catch (error) {
    console.error("Failed to power on iris sensor", error);
    throw error;
  }
};

const setIrisPowerOff = async (): Promise<void> => {
  try {
    await withTimeout(ExpoIdentifi.setIrisPowerOff(), 5000);
  } catch (error) {
    console.error("Failed to power off iris sensor", error);
    throw error;
  }
};

const cancelIrisCapture = async (): Promise<void> => {
  try {
    await withTimeout(ExpoIdentifi.cancelIrisCapture(), 5000);
  } catch (error) {
    console.error("Failed to cancel iris capture", error);
    throw error;
  }
};

const startIrisCapture = async (): Promise<IrisCaptureResult> => {
  try {
    const irisPowered = await getIrisPowerStatus();
    if (!irisPowered) {
      const powerOn = await setIrisPowerOn();
      console.log("Powered on iris sensor:", powerOn);
      if (!powerOn) {
        throw new Error("Failed to power on iris sensor");
      }
    }

    return await withTimeout(ExpoIdentifi.startCaptureIris(), 60000);
  } catch (error) {
    console.error("Failed to capture iris", error);
    throw error;
  }
};

const addIrisCaptureStatusListener = (
  listener: (event: IrisCaptureStatusEvent) => void,
) => ExpoIdentifi.addListener("onIrisCaptureStatus", listener);

const addIrisPreviewFrameListener = (listener: () => void) =>
  ExpoIdentifi.addListener("onIrisPreviewFrame", listener);

export default {
  connect,
  disconnect,
  captureFingerprints,
  getDeviceInfo,
  stopCapture,
  clearMemoryBuffer,
  setMinimumNFIQScore,
  getNFIQScore,
  getWSQImage,
  getSegmentedImage,
  startIrisCapture,
  cancelIrisCapture,
  getIrisPowerStatus,
  setIrisPowerOn,
  setIrisPowerOff,
  addIrisCaptureStatusListener,
  addIrisPreviewFrameListener,
};
