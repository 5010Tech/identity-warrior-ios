import { ExpoGrabba, GrabbaFound, GrabbaInfo } from "@/modules/expo-grabba";
import { tHelper } from "@/translations/translationHelper";
import { Device } from "@/types/Device";
import { logEvent } from "@/util/fieldLog";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";

// How long to gather devices before deciding what to do about ones this
// phone has not used before. Longer when there is a known one to wait for.
const DECIDE_MS = 2500;
const DECIDE_WITH_KNOWN_MS = 5000;

const serialOf = (device: Device) => Number(device.serialNumber);

/**
 * Keeps a Grabba connected whenever one is in range, with nothing to set up.
 *
 * A Grabba is a Bluetooth LE device: while the app is open and none is
 * connected, it looks for them. One this phone has used before is connected
 * to at once. The first one ever found is connected to and remembered. Any
 * other that shows up is asked about first.
 */
export function useGrabbaLink(
  devices: Device[],
  addDevice: (device: Device) => void,
) {
  const [grabba, setGrabba] = useState<GrabbaInfo | null>(null);
  const linked = useRef<GrabbaInfo | null>(null);

  const known = useRef(new Set<number>());
  known.current = new Set(
    devices.filter((d) => d.connectionType === "grabba").map(serialOf),
  );
  const addDeviceRef = useRef(addDevice);
  addDeviceRef.current = addDevice;

  // Not used before, seen in the search in hand.
  const unknown = useRef(new Map<number, GrabbaFound>());
  // Turned down (or removed from Devices) since the app started.
  const declined = useRef(new Set<number>());
  // Connecting, or waiting for an answer: nothing else is started meanwhile.
  const busy = useRef(false);
  const deciding = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Connected to, to be remembered once the device has said what it is.
  const toRemember = useRef<number | null>(null);
  const rememberTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const remember = useCallback((info: GrabbaInfo) => {
    if (toRemember.current !== info.serial) return;
    toRemember.current = null;
    if (rememberTimer.current) clearTimeout(rememberTimer.current);
    if (known.current.has(info.serial)) return;
    logEvent("grabba", `remembered: model ${info.model || "?"}`);
    addDeviceRef.current({
      connectionType: "grabba",
      serialNumber: String(info.serial),
      modelNumber: info.model || "Grabba",
      selected: false,
    });
  }, []);

  const connect = useCallback(
    async (serial: number) => {
      if (busy.current || linked.current) return;
      busy.current = true;
      try {
        const info = await ExpoGrabba.connect(serial);
        linked.current = info;
        setGrabba(info);
        if (!known.current.has(serial)) {
          toRemember.current = serial;
          // Its model comes a moment after connecting. If it never does,
          // it is remembered without one.
          if (info.model) remember(info);
          else {
            rememberTimer.current = setTimeout(
              () => linked.current && remember(linked.current),
              6000,
            );
          }
        }
      } catch (error) {
        logEvent("grabba", `could not connect to ${serial}`, error);
      } finally {
        busy.current = false;
      }
    },
    [remember],
  );

  const ask = useCallback(
    (found: GrabbaFound[]) => {
      busy.current = true;
      ExpoGrabba.stopDiscovery().catch(() => undefined);
      const turnDown = () => {
        found.forEach(({ serial }) => declined.current.add(serial));
        unknown.current.clear();
        busy.current = false;
      };
      logEvent("grabba", `asking about ${found.length} new device(s)`);
      Alert.alert(
        tHelper("grabbaFoundTitle"),
        tHelper("grabbaFoundText"),
        [
          // One button each, by serial number (what is printed on the unit).
          ...found.slice(0, 3).map(({ serial }) => ({
            text: tHelper("grabbaUseSerial") + " " + serial,
            onPress: () => {
              unknown.current.clear();
              busy.current = false;
              void connect(serial);
            },
          })),
          { text: tHelper("no"), style: "cancel" as const, onPress: turnDown },
        ],
        { cancelable: false },
      );
    },
    [connect],
  );

  const decide = useCallback(() => {
    deciding.current = null;
    if (busy.current || linked.current) return;
    const found = [...unknown.current.values()].filter(
      ({ serial }) => !declined.current.has(serial),
    );
    if (!found.length) return;
    // The first Grabba this phone has ever seen, and the only one in range:
    // used without asking.
    if (!known.current.size && found.length === 1) {
      void connect(found[0].serial);
      return;
    }
    ask(found);
  }, [ask, connect]);

  useEffect(() => {
    if (!ExpoGrabba.available) return;

    const found = ExpoGrabba.onFound((device) => {
      if (busy.current || linked.current) return;
      const { serial } = device;
      if (known.current.has(serial)) {
        void connect(serial);
        return;
      }
      if (declined.current.has(serial)) return;
      unknown.current.set(serial, device);
      if (!deciding.current) {
        deciding.current = setTimeout(
          decide,
          known.current.size ? DECIDE_WITH_KNOWN_MS : DECIDE_MS,
        );
      }
    });

    const connection = ExpoGrabba.onConnection((body) => {
      if (!body.connected || body.serial === undefined) {
        if (linked.current) logEvent("grabba", "no longer connected");
        linked.current = null;
        setGrabba(null);
        return;
      }
      const info = body as GrabbaInfo;
      linked.current = info;
      setGrabba(info);
      // What it is arrives after the connection is made.
      if (info.model || info.fingerprintReady) remember(info);
    });

    // Look whenever the app is open with no Grabba connected. Asking again
    // while a search is running does nothing, so this also picks up after
    // Bluetooth is switched on or a device drops out.
    const look = () => {
      if (AppState.currentState !== "active") return;
      if (busy.current || linked.current) return;
      ExpoGrabba.startDiscovery()
        .then((started) => {
          if (started) unknown.current.clear();
        })
        .catch(() => undefined);
    };
    ExpoGrabba.getConnected()
      .then((info) => {
        if (info) {
          linked.current = info;
          setGrabba(info);
        } else look();
      })
      .catch(look);
    const timer = setInterval(look, 5000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") look();
      else ExpoGrabba.stopDiscovery().catch(() => undefined);
    });

    return () => {
      found.remove();
      connection.remove();
      clearInterval(timer);
      subscription.remove();
      if (deciding.current) clearTimeout(deciding.current);
      if (rememberTimer.current) clearTimeout(rememberTimer.current);
    };
  }, [connect, decide, remember]);

  /** Removed from Devices: let go of it, and leave it alone until restart. */
  const forgetGrabba = useCallback((serial: number) => {
    declined.current.add(serial);
    if (linked.current?.serial === serial) {
      ExpoGrabba.disconnect().catch(() => undefined);
    }
  }, []);

  return { grabba, forgetGrabba };
}
