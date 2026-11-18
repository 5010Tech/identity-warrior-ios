import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'react-native-slapshot-capture-library' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const SlapshotCaptureLibrary = NativeModules.SlapshotCaptureLibrary
  ? NativeModules.SlapshotCaptureLibrary
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export {default as SlapshotCaptureEngine} from './SlapshotCaptureEngine'
export {default as SlapshotCaptureView} from './SlapshotCaptureView'
export {default as SlapshotCaptureError} from './SlapshotCaptureError'
export {default as SlapshotCaptureIdentity} from './SlapshotCaptureIdentity'
export {default as SlapshotCaptureModality} from "./SlapshotCaptureModality"
export {default as BackState} from './BackState'
export {default as CaptureEngineConfigBuilder} from './CaptureEngineConfigBuilder'
export {default as CaptureEngineConfig} from './CaptureEngineConfig'
export {default as CaptureEngineMode} from './CaptureEngineMode'
export {default as CaptureBiometricsRequest} from './CaptureBiometricsRequest'
export {default as CaptureRequestBuilder} from './CaptureRequestBuilder'
export {default as CaptureRequestSequenceBuilder} from './CaptureRequestSequenceBuilder'
export {default as CaptureRequestSequence} from './CaptureRequestSequence'
export {default as ReviewRequestBuilder} from './ReviewRequestBuilder'
export {default as ReviewRequest} from './ReviewRequest'
export {default as UserMode} from './UserMode'
export {default as CaptureRequestType} from './CaptureRequestType'
export {default as ExportCaptureRequestBuilder} from "./ExportCaptureRequestBuilder"
export {default as CaptureEngineFaceConfigBuilder} from "./CaptureEngineFaceConfigBuilder"
export {default as CaptureEngineFaceConfig} from "./CaptureEngineFaceConfig"
export {default as FpQualityScorerType} from "./FpQualityScorerType"
export {default as QualityLevel} from "./QualityLevel"
export {default as FpCondition} from "./FpCondition"
export {default as TorchSetting} from "./TorchSetting"
export {default as FingerType} from "./FingerType"
export {default as EncodingType} from "./EncodingType"
export {default as BiometricPayload} from "./BiometricPayload"
export {default as FaceCaptureRequestBuilder} from "./FaceCaptureRequestBuilder"
export {default as FaceCaptureRequest} from "./FaceCaptureRequest"
export {default as CaptureError} from "./CaptureError"


