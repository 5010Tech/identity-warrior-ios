import { Device } from "@/types/Device";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { retrieveDevices, storeDevices } from "../deviceStorage";

interface DevicesContextProps {
  devices: Device[];
  activeDevice: Device | null;
  setActiveDevice: (index: number) => void;
  deleteDevice: (index: number) => void;
  addDevice: (device: Device) => void;
}

const DevicesContext = createContext<DevicesContextProps>({
  devices: [],
  activeDevice: null,
  setActiveDevice: function (index): void {
    throw new Error("Function not implemented.");
  },
  deleteDevice: function (index): void {
    throw new Error("Function not implemented.");
  },
  addDevice: function (device: Device): void {
    throw new Error("Function not implemented.");
  },
});
export const DevicesProvider = ({ children }: PropsWithChildren) => {
  const [devices, setDevices] = useState<Device[]>([]);

  const activeDevice = useMemo(() => {
    return devices.find((device) => device.selected) || null;
  }, [devices]);

  const setActiveDevice = useCallback((index: number) => {
    setDevices((prevDevices) =>
      storeDevices(
        prevDevices.map((device, i) => ({
          ...device,
          selected: i === index && !device.selected,
        })),
      ),
    );
  }, []);

  const addDevice = useCallback((device: Device) => {
    setDevices((prevDevices) =>
      storeDevices([
        device,
        // A device added as the one in use takes that over from the rest.
        ...(device.selected
          ? prevDevices.map((d) => ({ ...d, selected: false }))
          : prevDevices),
      ]),
    );
  }, []);

  const deleteDevice = useCallback((index: number) => {
    setDevices((prevDevices) =>
      storeDevices(prevDevices.filter((device, i) => i !== index)),
    );
  }, []);

  useEffect(() => {
    const loadDevices = async () => {
      const devices = await retrieveDevices();
      setDevices(devices);
    };
    loadDevices();
  }, []);

  const value = useMemo(
    () => ({
      devices,
      activeDevice,
      setActiveDevice,
      deleteDevice,
      addDevice,
    }),
    [devices, activeDevice, setActiveDevice, deleteDevice, addDevice],
  );

  return (
    <DevicesContext.Provider value={value}>{children}</DevicesContext.Provider>
  );
};
export const useDevices = () => useContext(DevicesContext);
