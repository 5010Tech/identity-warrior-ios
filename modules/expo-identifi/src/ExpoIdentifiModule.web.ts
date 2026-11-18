import { EventEmitter } from "expo-modules-core";

const emitter = new EventEmitter({} as any);

const unsupported = async () => {
  throw new Error("ExpoIdentifi is only supported on iOS.");
};

export default {
  PI: Math.PI,
  async setValueAsync(value: string): Promise<void> {
    emitter.emit("onChange", { value });
  },
  hello() {
    return "Hello world! 👋";
  },
  connect: unsupported,
  disconnect: unsupported,
  captureFingerprints: unsupported,
  getDeviceInfo: unsupported,
  stopCapture: unsupported,
  clearMemoryBuffer: unsupported,
  setMinimumNFIQScore: unsupported,
  getNFIQScore: unsupported,
  getWSQImage: unsupported,
  getSegmentedImage: unsupported,
  startIrisCapture: unsupported,
  cancelIrisCapture: unsupported,
  getIrisPowerStatus: unsupported,
  setIrisPowerOn: unsupported,
  setIrisPowerOff: unsupported,
  addIrisCaptureStatusListener(
    listener: (event: { irisCaptureStatus: number }) => void,
  ) {
    return emitter.addListener("onIrisCaptureStatus", listener);
  },
  addIrisPreviewFrameListener(listener: () => void) {
    return emitter.addListener("onIrisPreviewFrame", listener);
  },
};
