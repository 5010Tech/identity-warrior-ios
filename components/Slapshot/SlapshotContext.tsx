import { CaptureEngineMode } from "@/modules/slapshot-capture-library/src";
import { createContext, PropsWithChildren, useContext } from "react";
import { SlapshotCaptureOptions } from "./SlapshotCaptureOptions";
import {
  SlapshotCaptureViewModel,
  useCreateSlapshotViewModel,
} from "./SlapshotCaptureViewModel";

const SlapshotContext = createContext<SlapshotCaptureViewModel | undefined>(
  undefined,
);

export const useSlapshotContext = () => useContext(SlapshotContext);

const slapshotOptions: SlapshotCaptureOptions = {
  autoStartCalibration: false,
  captureMode: CaptureEngineMode.AdministeredCapture,
};

export const SlapshotContextProvider = ({ children }: PropsWithChildren) => {
  const viewModel = useCreateSlapshotViewModel(slapshotOptions);

  return (
    <SlapshotContext.Provider value={viewModel}>
      {children}
    </SlapshotContext.Provider>
  );
};
