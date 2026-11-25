import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { useEffect } from "react";
import { logEvent } from "@/util/fieldLog";
import { Appearance, AppState } from "react-native";

/**
 * Applies the Dark Mode switch from App Settings to the whole app, like the
 * Android app's ThemeMode. Dark is the default. Appearance.setColorScheme makes
 * React Native's useColorScheme (and therefore every themed color) follow it.
 */
export function ThemeModeSync() {
  const { getValue, subscribe } = useAutofill();

  useEffect(() => {
    const apply = () => {
      const dark = getValue("appSettings")?.darkMode !== false;
      Appearance.setColorScheme(dark ? "dark" : "light");
    };
    apply();
    const unsubscribe = subscribe(apply);
    // iOS can hand the app the system's appearance again (coming back from
    // the background, after a system sheet), which would undo the setting.
    // Put it back whenever that happens.
    const appearance = Appearance.addChangeListener(({ colorScheme }) => {
      const wanted =
        getValue("appSettings")?.darkMode !== false ? "dark" : "light";
      if (colorScheme !== wanted) {
        logEvent("app", `appearance came back as ${colorScheme}; restoring ${wanted}`);
        Appearance.setColorScheme(wanted);
      }
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") apply();
    });
    return () => {
      unsubscribe();
      appearance.remove();
      appState.remove();
    };
  }, [getValue, subscribe]);

  return null;
}
