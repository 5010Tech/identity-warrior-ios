import { ExpoIdentifi } from "@/modules/expo-identifi";
import { Device } from "@/types/Device";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import WifiManager from "react-native-wifi-reborn";
import { logEvent } from "@/util/fieldLog";
import { useDevices } from "../devices";
import { ExpoNeoScanModule } from "@/modules/expo-neo-scan";

interface ActiveDeviceContextProps {
  activeDevice: Device | null;
  connecting: boolean;
  connectToDevice: () => Promise<boolean>;
  disconnectFromDevice: () => Promise<void>;
  checkNetworkConnected: (showDialog: boolean) => Promise<void>;
  connectionFailed: boolean;
  closeConnectionFailedDialog: () => void;
}
const ActiveDeviceContext = createContext<ActiveDeviceContextProps>({
  activeDevice: null,
  connecting: false,
  connectToDevice: function (): Promise<boolean> {
    throw new Error("Function not implemented.");
  },
  disconnectFromDevice: function (): Promise<void> {
    throw new Error("Function not implemented.");
  },
  checkNetworkConnected: function (showDialog: boolean): Promise<void> {
    throw new Error("Function not implemented.");
  },
  connectionFailed: false,
  closeConnectionFailedDialog: function (): void {
    throw new Error("Function not implemented.");
  },
});

export const ActiveDeviceProvider = ({ children }: PropsWithChildren) => {
  const [connecting, setConnecting] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const {
    activeDevice: selectedDevice,
    devices,
    addDevice,
    setActiveDevice,
  } = useDevices();

  // The Wi-Fi network the phone is on right now. An IdentiFI scanner is its
  // own Wi-Fi network, so this is how one is detected.
  const [currentSsid, setCurrentSsid] = useState<string | null>(null);
  // Networks already looked at for a scanner, so each is only tried once.
  const probed = useRef(new Set<string>());
  const probing = useRef(false);

  /**
   * As on Android, the scanner in use is the one that is detected: a Wi-Fi
   * (IdentiFI) scanner counts only while the phone is on its network. With
   * none detected the app collects with the camera (contactless). A Bluetooth
   * scanner is used when it is the selected device, as before.
   */
  const activeDevice = useMemo(() => {
    const onNetwork = currentSsid
      ? devices.find(
          (device) =>
            device.connectionType === "wifi" && device.ssid === currentSsid,
        )
      : undefined;
    if (onNetwork) return onNetwork;
    return selectedDevice?.connectionType === "bluetooth"
      ? selectedDevice
      : null;
  }, [currentSsid, devices, selectedDevice]);

  // Keep an eye on which network the phone is on: when the app comes to the
  // front (back from joining the scanner's Wi-Fi in Settings) and every few
  // seconds while it is open.
  useEffect(() => {
    let stopped = false;
    // A single reading can come back empty for a moment while the phone is
    // still on the network. Dropping the scanner on that would cut off a
    // capture in progress, so the network only counts as gone after several
    // empty readings in a row.
    let misses = 0;
    const check = async () => {
      const ssid = await WifiManager.getCurrentWifiSSID().catch(() => null);
      if (stopped) return;
      if (ssid) {
        misses = 0;
        setCurrentSsid((current) => {
          if (current !== ssid) logEvent("scanner", "Wi-Fi network changed");
          return ssid;
        });
        return;
      }
      misses += 1;
      if (misses >= 4) {
        setCurrentSsid((current) => {
          if (current) logEvent("scanner", "no Wi-Fi network for a while");
          return null;
        });
      }
    };
    check();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") check();
    }, 4000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => {
      stopped = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  // Off the scanner's network: a connection held to it is gone, so the next
  // capture connects afresh.
  useEffect(() => {
    // Not while a capture is in flight: the capture's own error handling
    // closes the link, and dropping it here cuts off a capture that the
    // scanner may still finish.
    if (
      !activeDevice &&
      ExpoIdentifi.isConnected() &&
      !ExpoIdentifi.isCapturing()
    ) {
      ExpoIdentifi.disconnect().catch(() => undefined);
    }
  }, [activeDevice]);

  // On a known scanner's network: make it the selected device as well, so the
  // Devices screen shows what is in use.
  useEffect(() => {
    if (!currentSsid) return;
    const index = devices.findIndex(
      (device) =>
        device.connectionType === "wifi" && device.ssid === currentSsid,
    );
    if (index >= 0 && !devices[index].selected) {
      logEvent("scanner", "known scanner detected; now the device in use");
      setActiveDevice(index);
    }
  }, [currentSsid, devices, setActiveDevice]);

  // On a network that is not a known scanner: see, once, whether a scanner
  // answers there. If one does it is added and used, with nothing to set up.
  useEffect(() => {
    const ssid = currentSsid;
    if (!ssid || probing.current || probed.current.has(ssid)) return;
    if (devices.some((d) => d.connectionType === "wifi" && d.ssid === ssid)) {
      return;
    }
    probed.current.add(ssid);
    probing.current = true;
    (async () => {
      try {
        await ExpoIdentifi.connect(true);
        const { modelNumber, serialNumber } =
          await ExpoIdentifi.getDeviceInfo();
        await ExpoIdentifi.disconnect().catch(() => undefined);
        // Still on that network? Then this is its scanner.
        const now = await WifiManager.getCurrentWifiSSID().catch(() => null);
        if (now === ssid) {
          logEvent("scanner", `scanner detected and added: model ${modelNumber}`);
          addDevice({
            ssid,
            modelNumber,
            serialNumber,
            selected: true,
            connectionType: "wifi",
          });
        }
      } catch {
        // No scanner on this network: contactless it is.
      } finally {
        probing.current = false;
      }
    })();
  }, [currentSsid, devices, addDevice]);

  const mounted = useRef(true);

  const checkNetworkConnected = useCallback(
    async (showDialog: boolean) => {
      try {
        const currentSSID = await WifiManager.getCurrentWifiSSID();
        if (currentSSID !== activeDevice?.ssid) {
          throw new Error("Not connected to the correct WiFi network");
        }
      } catch (error) {
        console.error("Error checking network connection:", error);
        showDialog && setConnectionFailed(true);
      }
    },
    [activeDevice?.ssid],
  );

  const connectToDevice = useCallback(async () => {
    mounted.current && setConnectionFailed(false);
    mounted.current && setConnecting(true);
    let success = false;
    if (activeDevice) {
      if (activeDevice.connectionType === "wifi") {
        try {
          const currentSSID = await WifiManager.getCurrentWifiSSID();
          if (currentSSID !== activeDevice.ssid) {
            throw new Error("Not connected to the correct WiFi network");
          }
          await ExpoIdentifi.connect();
          success = true;
        } catch (error) {
          console.error("Error setting active device:", error);
          mounted.current && setConnectionFailed(true);
        }
      }
      if (activeDevice.connectionType === "bluetooth") {
        try {
          success = await ExpoNeoScanModule.connect();
          if (!success) {
            throw new Error("Failed to connect to Bluetooth device");
          }
        } catch (error) {
          console.error("Error connecting to Bluetooth device:", error);
          await ExpoNeoScanModule.disconnect();
          mounted.current && setConnectionFailed(true);
        }
      }
    }
    mounted.current && setConnecting(false);
    return success;
  }, [activeDevice]);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const disconnectFromDevice = useCallback(async () => {
    // Nothing to close (a contactless collection, say): don't ask a scanner
    // that isn't there.
    if (!ExpoIdentifi.isConnected()) return;
    try {
      await ExpoIdentifi.disconnect();
    } catch (error) {
      console.error("Error disconnecting from device:", error);
    }
  }, []);

  useEffect(() => {
    return () => {
      mounted.current = false;
      disconnectFromDevice();
    };
  }, [disconnectFromDevice]);

  const closeConnectionFailedDialog = useCallback(() => {
    setConnectionFailed(false);
  }, []);

  const value: ActiveDeviceContextProps = useMemo(() => {
    return {
      activeDevice,
      connecting,
      connectToDevice,
      disconnectFromDevice,
      checkNetworkConnected,
      connectionFailed,
      closeConnectionFailedDialog,
    };
  }, [
    activeDevice,
    connecting,
    connectToDevice,
    disconnectFromDevice,
    checkNetworkConnected,
    connectionFailed,
    closeConnectionFailedDialog,
  ]);

  return (
    <>
      <ActiveDeviceContext.Provider value={value}>
        {children}
      </ActiveDeviceContext.Provider>
    </>
  );
};

export const useActiveDevice = () => useContext(ActiveDeviceContext);
