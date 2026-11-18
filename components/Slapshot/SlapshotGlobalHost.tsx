import { useSlapshotContext } from "@/components/Slapshot/SlapshotContext";
import { SlapshotCaptureView } from "@/modules/slapshot-capture-library/src";
import { StyleSheet, View } from "react-native";

export const SlapshotGlobalHost = () => {
  const viewModel = useSlapshotContext();

  if (!viewModel) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.host}>
      <SlapshotCaptureView readyCallback={viewModel.onViewReady} />
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
});
