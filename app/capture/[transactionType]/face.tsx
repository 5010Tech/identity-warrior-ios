import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";
import { SafeAreaView } from "@/components/themed";
import { useAllowCamera } from "@/components/useAllowCamera";
import { FaceCaptureIcon } from "@/features/capture";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { useCaptureValue } from "@/features/capture/context/hooks";
import { tHelper } from "@/translations/translationHelper";

export default function FaceCaptureScreen() {
  const router = useRouter();

  const cameraPermission = useAllowCamera();
  // As on Android, a Criminal Applicant needs every pose; otherwise only the
  // frontal face is required and the rest are optional.
  const allRequired = useCaptureValue<string | undefined>("dodTot") === "car";

  if (!cameraPermission?.granted) return <Spinner />;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.cards}>
        <FaceCaptureIcon pose="F" />
        <FaceCaptureIcon pose="L" required={allRequired} />
        <FaceCaptureIcon pose="R" required={allRequired} />
        <FaceCaptureIcon pose="LA" required={allRequired} />
        <FaceCaptureIcon pose="RA" required={allRequired} />
      </ScrollView>
      <Button text={tHelper("done")} onPress={router.back} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    gap: 12,
  },
  // The five cards divide the height between them; on a very small screen
  // they stop shrinking at 96pt and the list scrolls instead.
  cards: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 12,
    paddingTop: 4,
  },
});
