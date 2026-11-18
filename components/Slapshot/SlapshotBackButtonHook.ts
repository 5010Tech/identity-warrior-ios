import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { BackHandler } from "react-native";
import { doesStateUseSlapshotUI } from "./SlapshotCaptureStateMachine";
import {
  BackState,
  SlapshotCaptureEngine,
} from "@/modules/slapshot-capture-library/src";
import { useSlapshotContext } from "./SlapshotContext";

export const useSlapshotBackButtonHandler = (
  onBackPress: (state: BackState) => void,
) => {
  const viewModel = useSlapshotContext();
  const onBackPressCallback = onBackPress;

  // setup handling for hardware back press
  useFocusEffect(
    useCallback(() => {
      BackHandler.addEventListener("hardwareBackPress", handleBackButtonClick);

      return () => {
        BackHandler.removeEventListener(
          "hardwareBackPress",
          handleBackButtonClick,
        );
      };
    }, [onBackPressCallback]),
  );

  const handleBackButtonClick = (): boolean => {
    const handleBackButtonClickAsync = async () => {
      const backState: BackState =
        await SlapshotCaptureEngine.onBackPressedAsync();
      onBackPressCallback(backState);

      return backState;
    };

    const shouldDelegate = doesStateUseSlapshotUI(viewModel!.status);
    if (shouldDelegate) {
      handleBackButtonClickAsync();
    }

    /**
     * When true is returned the event will not be bubbled up
     * & no other back action will execute
     */
    return shouldDelegate;
  };
};
