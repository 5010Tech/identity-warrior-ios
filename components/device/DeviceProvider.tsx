import { PropsWithChildren } from "react";
import { ActiveDeviceProvider } from "./activeDevice";
import { DevicesProvider } from "./devices";

export default function DeviceProvider({ children }: PropsWithChildren) {
  return (
    <DevicesProvider>
      <ActiveDeviceProvider>{children}</ActiveDeviceProvider>
    </DevicesProvider>
  );
}
