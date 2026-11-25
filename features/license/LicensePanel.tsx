import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { Button } from "@/components/Button";
import { InputText } from "@/components/input";
import { Text, useThemeColor } from "@/components/themed";
import IwNetwork from "@/modules/iw-network";
import { tHelper } from "@/translations/translationHelper";
import {
  documentDirectory,
  EncodingType,
  readAsStringAsync,
  readDirectoryAsync,
} from "expo-file-system/legacy";
import { useEffect, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";
import { getDeviceId, importLicense, LicenseProblem } from "./license";
import {
  downloadLicense,
  isLicenseKey,
  LicenseSpringError,
  licenseSpringConfigured,
} from "./licenseSpring";

export const PROBLEM_TEXT = {
  unreadable: "licenseInvalidFile",
  deviceMismatch: "iwLicenseDeviceIdFail",
  expired: "iwLicenseExpired",
  insiteOnly: "licenseInsiteOnly",
  notConfigured: "licenseNotConfigured",
} as const;

/**
 * A license file's content: picked in the system's file browser, or, on a
 * build without that, the first .lic file in the app's own folder (the
 * "Identity Warrior" folder in the Files app).
 */
const readLicenseFile = async (): Promise<string | null | "none"> => {
  if (IwNetwork?.pickFile) {
    const picked = await IwNetwork.pickFile();
    return picked ? picked.base64 : null;
  }
  const folder = documentDirectory ?? "";
  const name = (await readDirectoryAsync(folder)).find((file) =>
    file.toLowerCase().endsWith(".lic"),
  );
  if (!name) return "none";
  return readAsStringAsync(folder + name, { encoding: EncodingType.Base64 });
};

/**
 * The working part of the license screen, as on Android: this device's ID,
 * Import License (a .lic file), and Download License (a LicenseSpring product
 * code and license key). Used by the lock screen and by Settings.
 */
export function LicensePanel({
  onImported,
  expiration,
  allowLatent,
}: {
  onImported?: () => void;
  /** The license in force runs out on this date (Settings shows it). */
  expiration?: string;
  /** False when the license withholds latent capture, which hides its tile. */
  allowLatent?: boolean;
}) {
  const surface = useThemeColor({}, "surface");
  const stroke = useThemeColor({}, "stroke");
  const strong = useThemeColor({}, "textStrong");
  const muted = useThemeColor({}, "textSecondary");
  const icon = useThemeColor({}, "icon");
  const { getValue, setValue } = useAutofill();

  const [deviceId, setDeviceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [productCode, setProductCode] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [errors, setErrors] = useState<{ product?: string; key?: string }>({});

  useEffect(() => {
    getDeviceId().then(setDeviceId).catch(() => undefined);
  }, []);

  /** Checks and stores a license; says what was wrong if it is refused. */
  const take = async (fileBase64: string, title: string) => {
    const result = await importLicense(fileBase64);
    if (result.problem !== "none") {
      Alert.alert(title, tHelper(PROBLEM_TEXT[result.problem as Exclude<LicenseProblem, "none">]));
      return;
    }
    if (result.abisSettings) {
      setValue("abisSettings", {
        ...(getValue("abisSettings") ?? {}),
        ...result.abisSettings,
      } as never);
    }
    onImported?.();
  };

  const runImport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const file = await readLicenseFile();
      if (file === null) return; // cancelled
      if (file === "none") {
        Alert.alert(tHelper("importLicense"), tHelper("licenseNoFile"));
        return;
      }
      await take(file, tHelper("importLicense"));
    } catch (error) {
      console.warn("License import failed", error);
      Alert.alert(tHelper("importLicense"), tHelper("iwLicenseFail"));
    } finally {
      setBusy(false);
    }
  };

  const runDownload = async () => {
    if (busy) return;
    const product = productCode.trim();
    const key = licenseKey.trim();
    const next: typeof errors = {};
    if (!product) next.product = tHelper("enterProductCode");
    if (!key) next.key = tHelper("enterLicenseKey");
    else if (!isLicenseKey(key)) next.key = tHelper("invalidLicenseKeyFormat");
    setErrors(next);
    if (next.product || next.key) return;
    setBusy(true);
    try {
      await take(await downloadLicense(product, key), tHelper("licenseDownload"));
    } catch (error) {
      // LicenseSpring's own reason when it gave one.
      const reason = error instanceof LicenseSpringError ? error.message : "";
      console.warn("License download failed", error);
      Alert.alert(
        tHelper("licenseDownload"),
        reason
          ? `${tHelper("licenseSpringFailed")}: ${reason}`
          : tHelper("licenseSpringFailed"),
      );
    } finally {
      setBusy(false);
    }
  };

  const card = [styles.card, { backgroundColor: surface, borderColor: stroke }];

  return (
    <View style={styles.panel}>
      {/* Kept short, so the whole screen fits without scrolling. */}
      <View style={card}>
        {!!expiration && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: muted }]}>
              {tHelper("licenseExpirationLabel")}
            </Text>
            <Text style={[styles.value, { color: strong }]}>{expiration}</Text>
          </View>
        )}
        {allowLatent !== undefined && (
          <View style={styles.row}>
            <Text style={[styles.label, { color: muted }]}>
              {tHelper("licenseLatentLabel")}
            </Text>
            <Text style={[styles.value, { color: strong }]}>
              {tHelper(allowLatent ? "licenseAllowed" : "licenseNotAllowed")}
            </Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={[styles.label, { color: muted }]}>
            {tHelper("deviceIdTitle")}
          </Text>
          {/* Selectable, so it can be copied into a license request. */}
          <Text
            selectable
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.value, styles.deviceId, { color: strong }]}
          >
            {deviceId}
          </Text>
          <Pressable
            hitSlop={10}
            disabled={!deviceId}
            accessibilityRole="button"
            accessibilityLabel={tHelper("licenseShareDeviceId")}
            onPress={() => void Share.share({ message: deviceId })}
          >
            <MaterialCommunityIcons name="share-variant" size={24} color={icon} />
          </Pressable>
        </View>
      </View>

      <Button
        icon="file-upload-outline"
        text={tHelper("importLicense")}
        disabled={busy}
        onPress={runImport}
      />
      {!IwNetwork?.pickFile && (
        <Text style={[styles.hint, { color: muted }]}>
          {tHelper("licenseFolderHint")}
        </Text>
      )}

      {licenseSpringConfigured() && (
        <View style={card}>
          <InputText
            label={tHelper("productCodeTitle")}
            placeholder={tHelper("productCodeHint")}
            value={productCode}
            onChange={setProductCode}
            error={errors.product}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <InputText
            label={tHelper("licenseKey")}
            placeholder={tHelper("licenseKeyHint")}
            value={licenseKey}
            onChange={setLicenseKey}
            error={errors.key}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button
            icon="cloud-download-outline"
            text={tHelper("licenseDownload")}
            disabled={busy}
            onPress={runDownload}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 10 },
  card: { gap: 8, padding: 12, borderWidth: 1, borderRadius: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { fontSize: 14 },
  value: { flex: 1, fontSize: 17, fontWeight: "700", textAlign: "right" },
  deviceId: { fontVariant: ["tabular-nums"] },
  hint: { fontSize: 13, textAlign: "center" },
});
