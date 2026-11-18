import { Button } from "@/components/Button";
import { useSlapshotContext } from "@/components/Slapshot/SlapshotContext";
import { Spinner } from "@/components/Spinner";
import { SafeAreaView } from "@/components/themed";
import { useAllowCamera } from "@/components/useAllowCamera";
import { FaceCaptureIcon } from "@/features/capture";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";

export default function FaceCaptureScreen() {
  const router = useRouter();

  const viewModel = useSlapshotContext();
  const cameraPermission = useAllowCamera();

  if (!viewModel || !cameraPermission?.granted) return <Spinner />;

  return (
    <SafeAreaView style={styles.container}>
      <FaceCaptureIcon pose="F" />
      <FaceCaptureIcon pose="L" />
      <FaceCaptureIcon pose="R" />
      <FaceCaptureIcon pose="LA" />
      <FaceCaptureIcon pose="RA" />
      <Button text="Done" onPress={router.back} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    gap: 10,
  },
});
