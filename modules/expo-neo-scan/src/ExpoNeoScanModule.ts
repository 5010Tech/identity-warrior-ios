import { requireNativeModule } from "expo-modules-core";
import { NeoScanDevice } from "./ExpoNeoScan.types";
import { Base64Image, FGP } from "@/types";
import { IMP } from "@/types/BiometricData";

const NeoScanNative = requireNativeModule("ExpoNeoScan");

const connect = (): Promise<boolean> => NeoScanNative.connectNeoScan();
const disconnect = () => NeoScanNative.disconnectNeoScan();

const getDeviceInfo = (): Promise<NeoScanDevice> =>
  NeoScanNative.getDeviceInfo();

const getImageList = (): Promise<string[]> => NeoScanNative.getImageList();

const setCaptureSequence = async (
  sequence: FGP[],
  impressionType: IMP.LIVE_SCAN_ROLLED | IMP.LIVE_SCAN_PLAIN,
): Promise<void> => {
  const scansXml = sequence
    .map(
      (code) =>
        `<Scan code="${code}" type="${impressionType === IMP.LIVE_SCAN_ROLLED ? "roll" : "flat"}" />`,
    )
    .join("");

  const profileXml = `<Profile>${scansXml}</Profile>`;

  try {
    await NeoScanNative.setCustomProfile(profileXml);
  } catch (error) {
    console.error("Error setting capture sequence:", error);
    throw error;
  }
};

const getConfiguration = () => NeoScanNative.getConfiguration();

const getImages = async (
  images: string[],
): Promise<
  {
    fgp: FGP;
    wsqBase64: Base64Image;
    previewBase64: Base64Image;
    error?: string;
  }[]
> => {
  const res = [];
  for (const image of images) {
    const fgp = parseInt(image.substring(0, image.lastIndexOf(".")).slice(-2));
    try {
      const { wsqBase64, previewBase64 } = await NeoScanNative.getImage(image);
      res.push({ fgp, wsqBase64, previewBase64 });
    } catch (error) {
      console.error("Error getting image:", error);
      res.push({
        fgp,
        wsqBase64: "",
        previewBase64: "",
        error: error as string,
      });
    }
  }
  return res;
};

export default {
  connect,
  disconnect,
  getDeviceInfo,
  getImageList,
  setCaptureSequence,
  getConfiguration,
  getImages,
};
