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
import WifiManager from "react-native-wifi-reborn";
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
  const { activeDevice } = useDevices();

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
