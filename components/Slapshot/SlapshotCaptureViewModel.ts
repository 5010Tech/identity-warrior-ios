import {
  BiometricPayload,
  CaptureEngineConfigBuilder,
  CaptureEngineFaceConfigBuilder,
  CaptureEngineMode,
  CaptureRequestBuilder,
  CaptureRequestSequence,
  CaptureRequestSequenceBuilder,
  CaptureRequestType,
  EncodingType,
  ExportCaptureRequestBuilder,
  FaceCaptureRequestBuilder,
  FingerType,
  FpCondition,
  FpQualityScorerType,
  SlapshotCaptureEngine,
  SlapshotCaptureError,
  SlapshotCaptureIdentity,
  UserMode,
} from "@/modules/slapshot-capture-library/src";
import { useMachine } from "@xstate/react";
import { useContext, useEffect, useRef, useState } from "react";
import { RootTagContext } from "react-native";
import { logger } from "react-native-logs";
import { useStorage } from "./AsyncStore";
import { SlapshotCaptureOptions } from "./SlapshotCaptureOptions";
import {
  SlapshotCaptureStates,
  isSlapshotCaptureState,
  slapshotCaptureStateMachine,
} from "./SlapshotCaptureStateMachine";
import { UserInterface, useCreateUserInterface } from "./UserInterface";
import licenseJson from "./assets/license.json";
import { fingerprintCaptureSequence } from "@/types";
import { FGP } from "@/types/BiometricData";
import { mapToFingerType } from "@/types/util";

type SlapshotCalibrationResult = SlapshotCaptureError | boolean;
type SlapshotCaptureResult = SlapshotCaptureIdentity | SlapshotCaptureError;
type SlapshotExportResult = SlapshotCaptureError | BiometricPayload;

export type SlapshotCaptureViewModel = {
  status: any;
  ui: UserInterface;
  calibrate: () => Promise<SlapshotCalibrationResult>;
  validateCalibration: () => Promise<SlapshotCalibrationResult>;
  completeCalibration: () => void;
  /** Selfie Mode from App Settings: self capture instead of administered. */
  setSelfieMode: (on: boolean) => void;
  captureBiometricsSelf: (
    faceCapture?: boolean,
  ) => Promise<SlapshotCaptureResult>;
  captureBiometricsAdministered: (
    faceCapture?: boolean,
    fingerprintCaptureSequence?: fingerprintCaptureSequence,
  ) => Promise<SlapshotCaptureResult>;
  captureSingleFinger: (
    fingerType: FingerType,
  ) => Promise<SlapshotCaptureResult>;
  /** Captures the given slap/thumb steps, in order (DoD 4-4-2 / 4-1-4-1). */
  captureFingerSteps: (steps: FGP[]) => Promise<SlapshotCaptureResult>;
  /** Captures one latent print (the SDK's Digital Lift). */
  captureLatent: () => Promise<SlapshotCaptureResult>;
  /** Captures one contactless palm (FingerType.LFP, LWP, RFP or RWP). */
  capturePalm: (palmType: FingerType) => Promise<SlapshotCaptureResult>;
  failCaptureBiometrics: () => void;
  exportIdentity: (
    slapshotCaptureIdentity: SlapshotCaptureIdentity,
    encodingType?: EncodingType,
  ) => Promise<SlapshotExportResult>;
  completeExportIdentity: () => void;
  onViewReady: (viewId: number) => void;
  restoredState: SlapshotCaptureStates;
  options: SlapshotCaptureOptions;
};

export function useCreateSlapshotViewModel(options: SlapshotCaptureOptions) {
  const log = logger.createLogger();

  const storageStateKey = "slapshotCaptureState";
  const storage = useStorage();

  const rootTag = useContext(RootTagContext);

  const [viewId, setViewId] = useState<number | null>(null);
  const [isSDKInitialized, setSDKInitialized] = useState<boolean>(false);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);

  // state coming from the state machine
  const [current, sendStatus] = useMachine(slapshotCaptureStateMachine);
  // the state that has been persisted to disk. We wait for the state to be persisted before we react to it so we can restore to that state
  const [persistedState, setPersistedState] = useState<SlapshotCaptureStates>(
    SlapshotCaptureStates.Inactive,
  );
  // we maintain a 'live' version of persisted state that can be used in the functions below where the 'capture' of persistedState could be 'stale'
  const livePersistedState = useRef(persistedState);
  // this is the state that is restored when the viewModel is created. On Activity restarts, this state is used to restore the SDK to it's state before the restart
  const [restoredState, setRestoredState] = useState<SlapshotCaptureStates>(
    SlapshotCaptureStates.Inactive,
  );

  const ui = useCreateUserInterface();

  // Set defaults for parameter object
  const {
    autoStartCalibration = true,
    captureMode = CaptureEngineMode.AdministeredCapture,
  } = options;

  useEffect(() => {
    log.info(
      "Slapshot - State Machine - Transition to State: " + current.value,
    );

    const updatedState = current.value;
    if (!isSlapshotCaptureState(updatedState)) {
      return;
    }

    switch (updatedState) {
      case SlapshotCaptureStates.Inactive:
        break;
      case SlapshotCaptureStates.NotCalibrated:
        ui.update(0, "");
        break;
      case SlapshotCaptureStates.Calibrated:
        ui.update(0, "");
        break;
      case SlapshotCaptureStates.Calibrating:
      case SlapshotCaptureStates.ValidatingCalibration:
      case SlapshotCaptureStates.CapturingSelf:
      case SlapshotCaptureStates.CapturingAdministered:
        // in Capture SDK
        setRestoredState(SlapshotCaptureStates.Inactive);
        break;
      case SlapshotCaptureStates.Exporting:
        ui.update(0, "Exporting Biometrics");
        break;
    }

    if (updatedState != SlapshotCaptureStates.Inactive) {
      persistState(updatedState);
    }
  }, [current.value]);

  useEffect(() => {
    log.info("Slapshot - Enter ViewModel with rootTag:" + rootTag);

    async function setupSlapshotSDK(logger: any) {
      logger.info(`Slapshot - Enter setupSlapshotSDK`);

      try {
        logger.info("Slapshot - Before Config");

        const faceConfig = CaptureEngineFaceConfigBuilder.create()
          // whether to auto capture after the face is validated. Otherwise, validation still occurs, but
          // user is prompted to manually capture. Manual capture can still be performed with this set to true
          .setAutoCaptureFaceAfterValidation(true)
          // when != 0, enforces a pixel width max of a face during validation
          .setMaxFaceWidthInPixels(0)
          // when != 0 (and setMaxFaceWidthInPixels == 0), enforces the max size of a face during validation based on the
          // ratio of the face width to the minor axis (shorter dimension) of the image capture
          .setMaxFaceWidthToMinorImageAxisRatio(0.75)
          // when != 0, enforces a pixel width min of a face during validation
          .setMinFaceWidthInPixels(0)
          // when != 0 (and setMinFaceWidthInPixels == 0), enforces the min size of a face during validation based on the
          // ratio of the face width to the minor axis (shorter dimension) of the image capture
          .setMinFaceWidthToMinorImageAxisRatio(0.25)
          // the milliseconds of consecutive, validated detected faces required to either trigger auto-capture or prompt the
          // user to manually trigger capture
          .setRequiredMillisecondsOfValidFacesBeforeCapture(1500)
          // a factor multiplied by the detected face width to determine the width of an exported, cropped, face image
          .setFaceExportPaddingFactor(1.5)
          // a factor multiplied by the exported, cropped face image's width, to determine it's height. If 1.0, then the
          // exported face image would have square dimensions (default)
          .setFaceExportHeightToWidthFactor(1.0)
          // when true, shows the bounds of the detected face during the capture preview. Should only be used for debugging purposes
          .setShowDebugFaceCaptureOverlays(false)
          .build();

        const config = CaptureEngineConfigBuilder.create()
          // this sets the overall 'mode' of the engine. You can still capture individual requests in either Admin or Selfie configuration,
          // but this mode determines settings more tuned to two major use-cases:
          // Administered: -calibrate once for lifetime of app (routine takes longer but more accurate, larger resulting calibrated 'zone'),
          //               -many captures are administered on a single device over a period of time by an experienced user
          //
          // SelfCapture: -calibrate once for lifetime of app (routine faster but less accurate, smaller resulting calibrated 'zone'),
          //              -single or handful of captures on a single device performed once by an inexperienced user submitting their own prints for 1 to 1 verification
          //              -1 to 1 verification does not require as accurate of a calibration
          .setMode(captureMode)
          // the number of retakes due to quality failure before override is allowed (default 2)
          .setNumberOfRetriesForSlapCapture(2)
          // the threshold (inclusive) for what is a considered a good capture of a print (default 4, corresponds to nfiq quality score, [0,5])
          .setInclusiveFingerprintQualityThreshold(4)
          // the number of fingers required in a 4-finger-slap to pass the quality threshold for the slap to pass the quality check (default 3)
          .setNumberOfValidFingersRequiredToAccept4Slap(3)
          // the number of fingers required in a 2-finger-slap to pass the quality threshold for the slap to pass the quality check (default 1)
          .setNumberOfValidFingersRequiredToAccept2Slap(1)
          // whether the quality failures on captured slaps will prevent user from accepting captures in capture review (default false)
          .setEnforceFingerValidationOnReview(false)
          // whether user can change the size and position of detected fingers in slap capture review (default true)
          .setAllowFingerPositionAndSizeEditing(true)
          // whether user can tap the screen to initiate capture sequence before automatic capture starts
          .setAllowCaptureInitByTap(false)
          // whether slaps must be captured with the subject's fingers spread (default false)
          .setEnforceFingerSpreadingForSlapCapture(false)
          // whether to show the names of the qualities of the fingers in review. Can be used in conjunction with addFpInclusiveQualityMapForScoreType()
          .setShowFpQualityNames(false)
          // whether to use specified colors during review to show finger qualities (default false). See api reference
          // for overriding these colors in your application
          .setUseQualityLevelColors(false)
          // adds a mapping for a scoring type (by name) of the range of quality scores that map to a QualityLevel
          // for display on the capture review screen. See api reference for examples. By default, default nfiq mapping is automatically set
          //.addFpInclusiveQualityMapForScoreType("NFIQ", nfiqQualityLevelMap)
          // set the below to plug in your own quality implementation. The MockNFIQScore gives all prints an
          // NFIQ score of 1. If the below is not set, an actual NFIQ score is used by default
          // .setFPQualityPluginClass("com.sciometrics.examples.MockNFIQScore")
          // sets the face config. By default, this is set to a default face config with default options set
          .setFaceConfig(faceConfig)
          // the quality scoring algorithm used to evaluate prints. Can be either NFIQ, NFIQ2 or 'Sciometrics', which is a propriety
          // quality algorithm tuned to contactless fingerprints (default NFIQ)
          .setFpQualityScorerType(FpQualityScorerType.NFIQ)
          .build();

        // configure the slapshot engine
        await SlapshotCaptureEngine.configureAsync(config);
        logger.info("Slapshot - After Config");

        // initialize the engine
        await SlapshotCaptureEngine.initAsync();

        // handle licensing
        const isLicensed = await SlapshotCaptureEngine.isLicensedAsync();
        logger.info(
          `SlapshotCaptureModule.isLicensed() returned ${isLicensed}`,
        );

        if (!isLicensed) {
          // use one of the two below entry points for licensing your app
          // await SlapshotCaptureEngine.setLicenseEntitlementAsync("[ENTITLEMENT_ID]");
          await SlapshotCaptureEngine.installLicenseAsync(
            licenseJson.licenseContent,
          );
          logger.info("Successfully licensed app");
        } else logger.info("App already licensed");

        // check to see if we have a persisted state, and whether the engine is able to restore its state
        const storedState = await storage.getItem(storageStateKey, "inactive");
        logger.info(`Retrieved stored state: ${storedState}`);
        const stateToRestore = (
          isSlapshotCaptureState(storedState) &&
          (await SlapshotCaptureEngine.canRestore())
            ? storedState
            : SlapshotCaptureStates.Inactive
        ) as SlapshotCaptureStates;
        logger.info(`Setting state to restore: ${stateToRestore}`);
        // set the requested restoredState
        setRestoredState(stateToRestore);

        setSDKInitialized(true);
      } catch (e) {
        logger.error(e);
        setSDKInitialized(false);
        sendStatus({ type: "INITIALIZATION_FAILED" });
      }

      logger.info("Slapshot - Exit setupSlapshotSDK");
    }

    if (!isSDKInitialized) setupSlapshotSDK(log);
    log.info("Slapshot - Exit useEffect");
  }, []);

  useEffect(() => {
    // we wait for both the sdk and the view that Slapshot will use to be 'ready'
    if (
      !!viewId &&
      isSDKInitialized &&
      (persistedState == SlapshotCaptureStates.Inactive ||
        persistedState == SlapshotCaptureStates.ReturnedFromSlapshot)
    ) {
      const isCalibratedResult = SlapshotCaptureEngine.isCalibrated();
      log.info(`Retrieved calibrated state: ${isCalibratedResult}`);
      setIsCalibrated(isCalibratedResult);

      // now move the state to an initialized state to allow the user to perform actions
      log.info(`SlapshotCaptureModule is initialized and ready to present`);
      if (isCalibratedResult) {
        sendStatus({ type: "CALIBRATED" });
      } else {
        sendStatus({ type: "NOT_CALIBRATED" });
      }
    }
  }, [viewId, isSDKInitialized, persistedState]);

  const calibrate = (): Promise<SlapshotCalibrationResult> => {
    return new Promise((resolve, reject) => {
      log.info(`Slapshot - running calibration on view ${viewId}`);

      const currentState = livePersistedState.current;
      if (
        currentState != SlapshotCaptureStates.NotCalibrated &&
        currentState != SlapshotCaptureStates.Calibrated
      ) {
        resolve(
          SlapshotCaptureError.fromErrorMessage(
            `The SDK is not in the initialized state. ${currentState}`,
          ),
        );
        return;
      }

      if (viewId === null) {
        resolve(
          SlapshotCaptureError.fromErrorMessage(
            "SlapshotCaptureModule requires a view to have been provisioned and set via onViewReady",
          ),
        );
        return;
      }

      sendStatus({ type: "CALIBRATING" });
      SlapshotCaptureEngine.calibrate(
        viewId!,
        (slapshotCaptureError: SlapshotCaptureError) => {
          resolve(slapshotCaptureError);
        },
        () => {
          resolve(true);
        },
      );
    });
  };

  const validateCalibration = (): Promise<SlapshotCalibrationResult> => {
    return new Promise((resolve, reject) => {
      log.info(`Slapshot - running calibration on view ${viewId}`);

      // validate preconditions using common code of other SDK calls
      const currentState = livePersistedState.current;
      if (currentState != SlapshotCaptureStates.Calibrated) {
        resolve(
          SlapshotCaptureError.fromErrorMessage(
            `The SDK is not in the calibration state. ${currentState}`,
          ),
        );
        return;
      }

      if (viewId === null) {
        resolve(
          SlapshotCaptureError.fromErrorMessage(
            "SlapshotCaptureModule requires a view to have been provisioned and set via onViewReady",
          ),
        );
        return;
      }

      sendStatus({ type: "VALIDATING_CALIBRATION" });
      SlapshotCaptureEngine.validateCalibration(
        viewId!,
        (slapshotCaptureError: SlapshotCaptureError) => {
          resolve(slapshotCaptureError);
        },
        () => {
          resolve(true);
        },
      );
    });
  };

  const completeCalibration = (): void => {
    log.info(`Slapshot - ending calibration on view ${viewId}`);

    const currentState = livePersistedState.current;
    if (
      currentState == SlapshotCaptureStates.Calibrating ||
      currentState == SlapshotCaptureStates.ValidatingCalibration
    ) {
      log.info(`sending status CALIBRATION_COMPLETE`);
      sendStatus({ type: "CALIBRATION_COMPLETE" });
    } else log.info(`not sending status ${currentState}`);
  };

  // Selfie Mode (App Settings): the operator is collecting their own prints,
  // so the SDK presents the capture for self use instead of administered.
  const selfieMode = useRef(false);
  const setSelfieMode = (on: boolean) => {
    selfieMode.current = on;
  };
  const userModeNow = () =>
    selfieMode.current ? UserMode.SelfCapture : UserMode.AdministeredCapture;

  const captureBiometricsSelf = (
    faceCapture?: boolean,
  ): Promise<SlapshotCaptureResult> => {
    return captureBiometrics(UserMode.SelfCapture, faceCapture);
  };

  const captureBiometricsAdministered = (
    faceCapture?: boolean,
    captureSequence?: fingerprintCaptureSequence,
  ): Promise<SlapshotCaptureResult> => {
    return captureBiometrics(
      userModeNow(),
      faceCapture,
      undefined,
      captureSequence,
    );
  };

  const captureSingleFinger = (
    fingerType: FingerType,
  ): Promise<SlapshotCaptureResult> => {
    return captureBiometrics(userModeNow(), false, fingerType);
  };
  const captureFingerSteps = (steps: FGP[]): Promise<SlapshotCaptureResult> => {
    return captureBiometrics(
      userModeNow(),
      false,
      undefined,
      undefined,
      steps,
    );
  };
  const captureLatent = (): Promise<SlapshotCaptureResult> => {
    return captureBiometrics(
      userModeNow(),
      false,
      undefined,
      undefined,
      undefined,
      CaptureRequestType.DigitalLift,
    );
  };
  const capturePalm = (palmType: FingerType): Promise<SlapshotCaptureResult> => {
    return captureBiometrics(
      userModeNow(),
      false,
      palmType,
      undefined,
      undefined,
      CaptureRequestType.PalmCapture,
    );
  };
  const captureBiometrics = (
    userMode: UserMode,
    faceCapture?: boolean,
    fingerType?: FingerType,
    fingerprintCaptureSequence?: fingerprintCaptureSequence,
    steps?: FGP[],
    singleRequestType?: CaptureRequestType,
  ): Promise<SlapshotCaptureResult> => {
    ui.update(0, "Processing biometric capture");

    return new Promise(async (resolve, reject) => {
      log.info(`Slapshot - running capture on view ${viewId}`);

      const currentState = livePersistedState.current;
      if (
        currentState != SlapshotCaptureStates.NotCalibrated &&
        currentState != SlapshotCaptureStates.Calibrated
      ) {
        resolve(
          SlapshotCaptureError.fromErrorMessage(
            `The SDK is not in the initialized state. ${currentState}`,
          ),
        );
        return;
      }

      if (viewId === null) {
        resolve(
          SlapshotCaptureError.fromErrorMessage(
            "SlapshotCaptureModule requires a view to have been provisioned and set via onViewReady",
          ),
        );
        return;
      }

      if (userMode === UserMode.AdministeredCapture)
        sendStatus({ type: "CAPTURING_ADMINISTERED" });
      else sendStatus({ type: "CAPTURING_SELF" });

      const captureRequestSequence = await createCaptureSequence(
        userMode,
        faceCapture,
        fingerType,
        fingerprintCaptureSequence,
        steps,
        singleRequestType,
      );

      SlapshotCaptureEngine.captureBiometrics(
        viewId!,
        captureRequestSequence,
        (slapshotCaptureError: SlapshotCaptureError) => {
          resolve(slapshotCaptureError);
        },
        (capturedIdentity: SlapshotCaptureIdentity) => {
          console.log("captured identity");
          resolve(capturedIdentity);
        },
      );
    });
  };

  const failCaptureBiometrics = (): void => {
    log.info(`Slapshot - failed capture on view ${viewId}`);
    sendStatus({ type: "CAPTURE_COMPLETE_FAILURE" });
  };

  const exportIdentity = (
    slapshotCaptureIdentity: SlapshotCaptureIdentity,
    encodingType: EncodingType = EncodingType.Wsq,
  ): Promise<SlapshotExportResult> => {
    const exportCaptureRequest = ExportCaptureRequestBuilder.create(
      slapshotCaptureIdentity,
    )
      // the encoding type that the image data will be encoded by. Options are raw, png and wsq (default png)
      .setEncodingType(encodingType)
      // whether to constrain the slap dimension space to 1600x1500 (default true). If enabled, then the
      // native finger captures could be transformed in output image space to meet this constraint
      .setConstrainSlapDimensionsTo1600x1500(true)
      // whether to include the multi-finger slaps in the outputted biometrics (rather than just the individual finger biometrics) (default true)
      .setIncludeSlaps(false)
      // whether to scale all outputted finger biometrics from their native capture to 500 dpi (default true)
      .setScaleTo500dpi(true)
      // the encoding type of face exports (default jpg)
      .setFacesEncoding(EncodingType.Jpg)
      // whether the exported faces will be cropped to just the face, if possible (default true)
      .setFacesExportCropped(true)
      // the max width or height of exported faces. Values <= 0 result in no max being set (default 0)
      .setFacesMaxDimension(1500)
      // sets a progress callback
      .setProgressCallback((progress) => {
        // scale percentage to expected 0 -> 1
        const progressPercent = progress / 100;
        if (progress === 100) {
          ui.update(progressPercent, "Biometric export complete.");
        } else {
          ui.update(progressPercent, "Exporting biometrics.  Please wait...");
        }

        log.info(`export progress ${progress}`);
      })
      .build();

    sendStatus({ type: "EXPORTING" });
    return new Promise((resolve, reject) => {
      if (!slapshotCaptureIdentity.isValid()) {
        resolve(
          SlapshotCaptureError.fromErrorMessage(
            "The slapshotCaptureIdentity is not valid.",
          ),
        );
      }

      log.info(`Slapshot - running exportIdentity on view ${viewId}`);

      SlapshotCaptureEngine.exportIdentity(
        exportCaptureRequest,
        (slapshotCaptureError) => {
          resolve(slapshotCaptureError);
        },
        (biometricPayload) => {
          resolve(biometricPayload);
        },
      );
    });
  };

  const completeExportIdentity = (): void => {
    log.info(`Slapshot - complete export ${rootTag}`);
    sendStatus({ type: "EXPORT_COMPLETE" });
  };

  const createCaptureSequence = async (
    userMode: UserMode,
    faceCapture?: boolean,
    fingerType?: FingerType,
    fingerprintCaptureSequence?: fingerprintCaptureSequence,
    steps?: FGP[],
    singleRequestType?: CaptureRequestType,
  ): Promise<CaptureRequestSequence> => {
    let captureRequestSequenceBuilder;
    if (singleRequestType) {
      captureRequestSequenceBuilder = CaptureRequestSequenceBuilder.create(
        userMode,
      ).addCaptureRequest(
        // A palm request names which palm through the explicit finger type,
        // the same way the Android app builds it.
        (fingerType
          ? CaptureRequestBuilder.create(singleRequestType)
              .setReviewCapture(true)
              .setSingleFingerCaptureExplicitType(fingerType)
          : CaptureRequestBuilder.create(singleRequestType).setReviewCapture(
              true,
            )
        ).build(),
      );
    } else if (steps?.length) {
      const slapTypes: Partial<Record<FGP, CaptureRequestType>> = {
        [FGP.PLAIN_LEFT_FOUR_FINGERS]: CaptureRequestType.LeftSlap,
        [FGP.PLAIN_RIGHT_FOUR_FINGERS]: CaptureRequestType.RightSlap,
        [FGP.PLAIN_LEFT_AND_RIGHT_THUMBS]: CaptureRequestType.ThumbsSlap,
      };
      let builder = CaptureRequestSequenceBuilder.create(userMode);
      for (const step of steps) {
        const slapType = slapTypes[step];
        const request = slapType
          ? CaptureRequestBuilder.create(slapType)
              .setReviewCapture(true)
              .setMissingFingerMapping(new Map<FingerType, FpCondition>())
              .build()
          : CaptureRequestBuilder.create(CaptureRequestType.SingleFingerCapture)
              .setReviewCapture(true)
              .setSingleFingerCaptureExplicitType(mapToFingerType(step))
              .build();
        builder = builder.addCaptureRequest(request);
      }
      captureRequestSequenceBuilder = builder;
    } else if (faceCapture) {
      if (livePersistedState.current === SlapshotCaptureStates.NotCalibrated) {
        await calibrate();
      }
      const faceCaptureRequest = FaceCaptureRequestBuilder.create()
        .setIsLandscape(false)
        .setReviewCapture(true)
        .build();
      captureRequestSequenceBuilder =
        CaptureRequestSequenceBuilder.create(userMode).addCaptureRequest(
          faceCaptureRequest,
        );
    } else if (fingerType) {
      const fingerCaptureRequest = CaptureRequestBuilder.create(
        CaptureRequestType.SingleFingerCapture,
      )
        .setReviewCapture(true)
        .setSingleFingerCaptureExplicitType(fingerType)
        .build();
      captureRequestSequenceBuilder =
        CaptureRequestSequenceBuilder.create(userMode).addCaptureRequest(
          fingerCaptureRequest,
        );
    } else {
      // can be populated to have finger conditions preset for the request. If not in the mapping,
      // fingers are assumed to be 'Normal'
      const missingMap = new Map<FingerType, FpCondition>();

      if (fingerprintCaptureSequence === "twoFlat") {
        const rFlatCaptureRequest = CaptureRequestBuilder.create(
          CaptureRequestType.SingleFingerCapture,
        )
          .setReviewCapture(true)
          .setSingleFingerCaptureExplicitType(FingerType.RI)
          .build();
        const lFlatCaptureRequest = CaptureRequestBuilder.create(
          CaptureRequestType.SingleFingerCapture,
        )
          .setReviewCapture(true)
          .setSingleFingerCaptureExplicitType(FingerType.LI)
          .build();
        captureRequestSequenceBuilder = CaptureRequestSequenceBuilder.create(
          userMode,
        )
          .addCaptureRequest(rFlatCaptureRequest)
          .addCaptureRequest(lFlatCaptureRequest);
      } else {
        const lSlapCaptureRequest = CaptureRequestBuilder.create(
          CaptureRequestType.LeftSlap,
        )
          .setReviewCapture(true)
          .setMissingFingerMapping(missingMap)
          .build();
        const rSlapCaptureRequest = CaptureRequestBuilder.create(
          CaptureRequestType.RightSlap,
        )
          .setReviewCapture(true)
          .setMissingFingerMapping(missingMap)
          .build();
        const thumbsSlapCaptureRequest = CaptureRequestBuilder.create(
          CaptureRequestType.ThumbsSlap,
        )
          .setReviewCapture(true)
          .setMissingFingerMapping(missingMap)
          .build();
        const leftThumbSlapCaptureRequest = CaptureRequestBuilder.create(
          CaptureRequestType.SingleFingerCapture,
        )
          .setReviewCapture(true)
          .setMissingFingerMapping(missingMap)
          .setSingleFingerCaptureExplicitType(FingerType.LT)
          .build();
        const rightThumbSlapCaptureRequest = CaptureRequestBuilder.create(
          CaptureRequestType.SingleFingerCapture,
        )
          .setReviewCapture(true)
          .setMissingFingerMapping(missingMap)
          .setSingleFingerCaptureExplicitType(FingerType.RT)
          .build();
        // currently unused request, but could be added to capture sequence

        // add as many individually configured capture requests to a capture request sequence
        captureRequestSequenceBuilder = CaptureRequestSequenceBuilder.create(
          userMode,
        ) // user mode determines how the app is presented to the user (Administered: taking someone else's biometrics, Selfie: taking your own biometrics)
          .addCaptureRequest(rSlapCaptureRequest)
          .addCaptureRequest(lSlapCaptureRequest);

        if (userMode === UserMode.AdministeredCapture)
          captureRequestSequenceBuilder =
            captureRequestSequenceBuilder.addCaptureRequest(
              thumbsSlapCaptureRequest,
            );
        else
          captureRequestSequenceBuilder = captureRequestSequenceBuilder
            .addCaptureRequest(rightThumbSlapCaptureRequest)
            .addCaptureRequest(leftThumbSlapCaptureRequest);
      }
    }

    return captureRequestSequenceBuilder.build();
  };

  const persistState = (state: SlapshotCaptureStates) => {
    log.info(`Slapshot - persisting state ${state}`);
    storage
      .setItem(storageStateKey, state)
      .then((_) => {
        log.info(`Slapshot - persisted state ${state}`);
        setPersistedState(state);
        livePersistedState.current = state;
      })
      .catch((e) => {
        log.info(`Slapshot - error persisting state ${state} ${e}`);
      });
  };

  // callback for the SlapshotCaptureView to provide the viewId
  const onViewReady = (viewId: number): void => {
    log.info(`Slapshot - view ${viewId} ready`);
    setViewId(viewId);
  };

  return {
    ui,
    calibrate,
    validateCalibration,
    completeCalibration,
    setSelfieMode,
    captureBiometricsSelf,
    captureBiometricsAdministered,
    captureSingleFinger,
    captureFingerSteps,
    captureLatent,
    capturePalm,
    failCaptureBiometrics,
    exportIdentity,
    completeExportIdentity,
    onViewReady,
    restoredState,
    status: persistedState,
    options,
  };
}
