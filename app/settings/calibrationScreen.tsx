import { SlapshotCaptureStates } from "@/components/Slapshot/SlapshotCaptureStateMachine";
import { useSlapshotContext } from "@/components/Slapshot/SlapshotContext";
import { SafeAreaView } from "@/components/themed";
import { SlapshotCaptureView } from "@/modules/slapshot-capture-library/src";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

export default function CalibrationScreen() {
  const router = useRouter();
  const viewModel = useSlapshotContext();

  const [viewReady, setViewReady] = useState(false);
  const [showView, setShowView] = useState(true);

  const handleViewReady = (viewId: number) => {
    if (!viewModel) return;
    console.log("Calibration view ready:", viewId);
    viewModel.onViewReady(viewId);
    setViewReady(true);
  };

  useEffect(() => {
    if (!viewReady || !viewModel) return;

    const runCalibration = async () => {
      try {
        // Reset SDK to inactive before starting calibration
        viewModel.restoredState = SlapshotCaptureStates.Inactive;

        // Small delay ensures SDK internal state propagates
        await new Promise((resolve) => setTimeout(resolve, 50));

        console.log("Starting calibration...");
        const result = await viewModel.calibrate();
        console.log(result);
      } catch (err) {
        // Ignore errors, we just want to exit
        console.warn("Calibration error (ignored):", err);
      } finally {
        viewModel.completeCalibration();
        // Unmount the view and return to appSettings
        setShowView(false);
        router.back();
      }
    };

    runCalibration();
  }, [router, viewModel, viewReady]);

  if (!viewModel) return null;
  return (
    <SafeAreaView style={styles.container}>
      {showView && (
        <SlapshotCaptureView
          style={styles.captureView}
          readyCallback={handleViewReady}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  captureView: { flex: 1 },
});
