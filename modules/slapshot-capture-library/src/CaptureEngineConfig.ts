import CaptureEngineFaceConfig from "./CaptureEngineFaceConfig";
import CaptureEngineMode from "./CaptureEngineMode";
import FpQualityScorerType from "./FpQualityScorerType";
import QualityLevel from "./QualityLevel";
import {mapToObject, mapsToObject} from "./helpers/NativeBridgeHelper"

export default class CaptureEngineConfig{
    public readonly captureEngineMode: CaptureEngineMode | undefined;
    public readonly numberOfRetriesForSlapCapture: number | undefined;
    public readonly inclusiveFingerprintQualityThreshold: number | undefined;
    public readonly numberOfValidFingersRequiredToAccept4Slap: number | undefined;
    public readonly numberOfValidFingersRequiredToAccept2Slap: number | undefined;
    public readonly fpQualityScorerType: FpQualityScorerType | undefined;
    public readonly enforceFingerValidationOnReview: boolean | undefined;
    public readonly allowFingerPositionAndSizeEditing: boolean | undefined;
    public readonly allowCaptureInitByTap: boolean | undefined;
    public readonly useModelBasedCalibrationByDefault: boolean | undefined;
    public readonly enforceFingerSpreadingForSlapCapture: boolean | undefined;
    public readonly showFingersSpreadForSlapCapture: boolean | undefined;
    public readonly showFpQualityNames: boolean | undefined;
    public readonly useQualityLevelColors: boolean | undefined;
    public readonly validationCapturesForModelBasedCalibration: number | undefined;
    public readonly allowSetMissingFingersDuringCapture: boolean | undefined;
    public readonly fPQualityPluginClass: string | undefined;
    public readonly fpInclusiveQualityMapForScoreTypes: Map<string,Map<number,QualityLevel>> | undefined;
    public readonly faceConfig: CaptureEngineFaceConfig | undefined;
    private readonly fpInclusiveQualityMapForScoreTypesShim: any | undefined

    constructor(
        captureEngineMode: CaptureEngineMode | undefined,
        numberOfRetriesForSlapCapture: number | undefined,
        inclusiveFingerprintQualityThreshold: number | undefined,
        numberOfValidFingersRequiredToAccept4Slap: number | undefined,
        numberOfValidFingersRequiredToAccept2Slap: number | undefined,
        fpQualityScorerType: FpQualityScorerType | undefined,
        enforceFingerValidationOnReview: boolean | undefined,
        allowFingerPositionAndSizeEditing: boolean | undefined,
        allowCaptureInitByTap: boolean | undefined,
        useModelBasedCalibrationByDefault: boolean | undefined,
        enforceFingerSpreadingForSlapCapture: boolean | undefined,
        showFingersSpreadForSlapCapture: boolean | undefined,
        showFpQualityNames: boolean | undefined,
        useQualityLevelColors: boolean | undefined,
        validationCapturesForModelBasedCalibration: number | undefined,
        allowSetMissingFingersDuringCapture: boolean | undefined,
        fPQualityPluginClass: string | undefined,
        fpInclusiveQualityMapForScoreTypes: Map<string,Map<number,QualityLevel>> | undefined,
        faceConfig: CaptureEngineFaceConfig | undefined,
        ) {
        this.captureEngineMode = captureEngineMode;
        this.numberOfRetriesForSlapCapture = numberOfRetriesForSlapCapture;
        this.inclusiveFingerprintQualityThreshold = inclusiveFingerprintQualityThreshold;
        this.numberOfValidFingersRequiredToAccept4Slap = numberOfValidFingersRequiredToAccept4Slap;
        this.numberOfValidFingersRequiredToAccept2Slap = numberOfValidFingersRequiredToAccept2Slap;
        this.fpQualityScorerType = fpQualityScorerType;
        this.enforceFingerValidationOnReview = enforceFingerValidationOnReview;
        this.allowFingerPositionAndSizeEditing = allowFingerPositionAndSizeEditing;
        this.allowCaptureInitByTap = allowCaptureInitByTap;
        this.useModelBasedCalibrationByDefault = useModelBasedCalibrationByDefault;
        this.enforceFingerSpreadingForSlapCapture = enforceFingerSpreadingForSlapCapture;
        this.showFingersSpreadForSlapCapture = showFingersSpreadForSlapCapture;
        this.showFpQualityNames = showFpQualityNames;
        this.useQualityLevelColors = useQualityLevelColors;
        this.validationCapturesForModelBasedCalibration = validationCapturesForModelBasedCalibration;
        this.allowSetMissingFingersDuringCapture = allowSetMissingFingersDuringCapture;
        this.fPQualityPluginClass = fPQualityPluginClass;
        this.fpInclusiveQualityMapForScoreTypes = fpInclusiveQualityMapForScoreTypes;
        this.faceConfig = faceConfig;

        if (fpInclusiveQualityMapForScoreTypes) {
            this.fpInclusiveQualityMapForScoreTypesShim = mapsToObject(fpInclusiveQualityMapForScoreTypes);
        }
    }
}