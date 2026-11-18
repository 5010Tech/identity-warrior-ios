import CaptureEngineConfig from "./CaptureEngineConfig";
import CaptureEngineFaceConfig from "./CaptureEngineFaceConfig";
import CaptureEngineMode from "./CaptureEngineMode";
import FpQualityScorerType from "./FpQualityScorerType";
import QualityLevel from "./QualityLevel";

export default class CaptureEngineConfigBuilder {
    private _captureEngineMode: CaptureEngineMode | undefined;
    private _numberOfRetriesForSlapCapture: number | undefined;
    private _inclusiveFingerprintQualityThreshold: number | undefined;
    private _numberOfValidFingersRequiredToAccept4Slap: number | undefined;
    private _numberOfValidFingersRequiredToAccept2Slap: number | undefined;
    private _fpQualityScorerType: FpQualityScorerType | undefined;
    private _enforceFingerValidationOnReview: boolean | undefined;
    private _allowFingerPositionAndSizeEditing: boolean | undefined;
    private _allowCaptureInitByTap: boolean | undefined;
    private _useModelBasedCalibrationByDefault: boolean | undefined;
    private _enforceFingerSpreadingForSlapCapture: boolean | undefined;
    private _showFingersSpreadForSlapCapture: boolean | undefined;
    private _showFpQualityNames: boolean | undefined;
    private _useQualityLevelColors: boolean | undefined;
    private _validationCapturesForModelBasedCalibration: number | undefined;
    private _allowSetMissingFingersDuringCapture: boolean | undefined;
    private _fPQualityPluginClass: string | undefined;
    private _fpInclusiveQualityMapForScoreTypes: Map<string,Map<number,QualityLevel>> | undefined;
    private _faceConfig: CaptureEngineFaceConfig | undefined;

    private constructor() {

    }

    static create() : CaptureEngineConfigBuilder {
        return new CaptureEngineConfigBuilder();
    }

    build() : CaptureEngineConfig {
        // In the SDK, NFIQ2 is a plugin and not an actual option for fpQualityScorerType. So, if it's set in the react
        // native side, we have to remap it as a plugin here
        if (!this._fPQualityPluginClass && this._fpQualityScorerType === FpQualityScorerType.NFIQ2) {
            this.setFPQualityPluginClass("com.sciometrics.android.nfiq2.NFIQ2Plugin");
            this._fpQualityScorerType = undefined;
        }

        return new CaptureEngineConfig(
            this._captureEngineMode,
            this._numberOfRetriesForSlapCapture,
            this._inclusiveFingerprintQualityThreshold,
            this._numberOfValidFingersRequiredToAccept4Slap,
            this._numberOfValidFingersRequiredToAccept2Slap,
            this._fpQualityScorerType,
            this._enforceFingerValidationOnReview,
            this._allowFingerPositionAndSizeEditing,
            this._allowCaptureInitByTap,
            this._useModelBasedCalibrationByDefault,
            this._enforceFingerSpreadingForSlapCapture,
            this._showFingersSpreadForSlapCapture,
            this._showFpQualityNames,
            this._useQualityLevelColors,
            this._validationCapturesForModelBasedCalibration,
            this._allowSetMissingFingersDuringCapture,
            this._fPQualityPluginClass,
            this._fpInclusiveQualityMapForScoreTypes,
            this._faceConfig);
    }
    
    /**
     *  this sets the overall 'mode' of the engine. You can still capture individual requests in either Admin or Selfie configuration,
     *  but this mode determines settings more tuned to two major use-cases:
     *  Administered: -calibrate once for lifetime of app (routine takes longer but more accurate, larger resulting calibrated 'zone'),
     *               -many captures are administered on a single device over a period of time by an experienced user
     *               
     *  SelfCapture: -calibrate once for lifetime of app (routine faster but less accurate, smaller resulting calibrated 'zone'),
     *               -single or handful of captures on a single device performed once by an inexperienced user submitting their own prints for 1 to 1 verification
     *               -1 to 1 verification does not require as accurate of a calibration
     * @param captureEngineMode the mode
     * @returns builder
     */
    setMode(captureEngineMode: CaptureEngineMode) : CaptureEngineConfigBuilder {
        this._captureEngineMode = captureEngineMode;
        return this;
    }

    /**
     * sets the number of times a user can retake a slap capture when it falls below the quality thresholds. After the set number of retakes,
     * the system will allow the captures to be accepted, and the best capture (even though all did not meet the quality thesholds) will be used. (2 by default)
     * @param numberOfRetries the number of times a user can retake a slap capture when it falls below the quality thresholds (2 by default)
     * @returns builder
     */
    setNumberOfRetriesForSlapCapture(numberOfRetries: number) : CaptureEngineConfigBuilder{
        this._numberOfRetriesForSlapCapture = numberOfRetries;
        return this;
    }

    /**
     * the threshold (inclusive) for what is a considered a good capture of a print (default 4, corresponds to nfiq quality score, [0,5])
     * @param inclusiveFingerprintQualityThreshold 
     * @returns builder
     */
    setInclusiveFingerprintQualityThreshold(inclusiveFingerprintQualityThreshold: number) : CaptureEngineConfigBuilder{
        this._inclusiveFingerprintQualityThreshold = inclusiveFingerprintQualityThreshold;
        return this;
    }

    /**
     * sets the number of fingers in a 4 finger slap that need to be considered 'good' (via getInclusiveFingerprintQualityThreshold) for the
     * slap to be able to be accepted (and not 're-taken) (3 by default)
     * @param numberOfValidFingersRequiredToAccept4Slap 
     * @returns builder
     */
    setNumberOfValidFingersRequiredToAccept4Slap(numberOfValidFingersRequiredToAccept4Slap: number) : CaptureEngineConfigBuilder{
        this._numberOfValidFingersRequiredToAccept4Slap = numberOfValidFingersRequiredToAccept4Slap;
        return this;
    }
    
    /**
     * sets the number of fingers in a 2 thumb slap that need to be considered 'good' (via getInclusiveFingerprintQualityThreshold) for the
     * slap to be able to be accepted (and not 're-taken) (1 by default)
     * @param numberOfValidFingersRequiredToAccept2Slap 
     * @returns builder
     */
    setNumberOfValidFingersRequiredToAccept2Slap(numberOfValidFingersRequiredToAccept2Slap: number) : CaptureEngineConfigBuilder{
        this._numberOfValidFingersRequiredToAccept2Slap = numberOfValidFingersRequiredToAccept2Slap;
        return this;
    }

    /**
     * the quality scoring algorithm used to evaluate prints. Can be either NFIQ or 'Sciometrics', which is a propriety
     * quality algorithm tuned to contactless fingerprints (default NFIQ)
     * @param fpQualityScorerType 
     * @returns builder
     */
    setFpQualityScorerType(fpQualityScorerType: FpQualityScorerType) : CaptureEngineConfigBuilder{
        this._fpQualityScorerType = fpQualityScorerType;
        return this;
    }

    /**
     * whether the quality failures on captured slaps will prevent user from accepting captures in capture review (default false)
     * @param enforceFingerValidationOnReview 
     * @returns builder
     */
    setEnforceFingerValidationOnReview(enforceFingerValidationOnReview: boolean) : CaptureEngineConfigBuilder{
        this._enforceFingerValidationOnReview = enforceFingerValidationOnReview;
        return this;
    }

    /**
     * whether user can change the size and position of detected fingers in slap capture review (default true)
     * @param allowFingerPositionAndSizeEditing 
     * @returns builder
     */
    setAllowFingerPositionAndSizeEditing(allowFingerPositionAndSizeEditing: boolean) : CaptureEngineConfigBuilder{
        this._allowFingerPositionAndSizeEditing = allowFingerPositionAndSizeEditing;
        return this;
    }

    /**
     * sets whether the user can initiate the capture sequence by tapping the screen before
     * the engine initiates the automatic capture. This can be userful in the scenario where there is an experienced
     * user that is capturing many subjects as they may be able to place the target in the correct capture 'zone'
     * before the engine detects that they are there. (false, by default)
     * @param allowCaptureInitByTap whether the user can initiate the capture sequence by tapping the screen (false, by default)
     * @returns builder
     */
    setAllowCaptureInitByTap(allowCaptureInitByTap: boolean) : CaptureEngineConfigBuilder{
        this._allowCaptureInitByTap = allowCaptureInitByTap;
        return this;
    }

    /**
     * Not currently supported in ReactNative. Ask support for details.
     * @param useModelBasedCalibrationByDefault 
     * @returns builder
     */
    setUseModelBasedCalibrationByDefault(useModelBasedCalibrationByDefault: boolean) : CaptureEngineConfigBuilder{
        this._useModelBasedCalibrationByDefault = useModelBasedCalibrationByDefault;
        return this;
    }

    /**
     * whether slaps must be captured with the subject's fingers spread (default false)
     * @param enforceFingerSpreadingForSlapCapture 
     * @returns builder
     */
    setEnforceFingerSpreadingForSlapCapture(enforceFingerSpreadingForSlapCapture: boolean) : CaptureEngineConfigBuilder{
        this._enforceFingerSpreadingForSlapCapture = enforceFingerSpreadingForSlapCapture;
        return this;
    }

    /**
     * whether the finger guides displayed in the capture screen will be spread apart rather then together (default: false)
     * @param showFingersSpreadForSlapCapture 
     * @returns builder
     */
    setShowFingersSpreadForSlapCapture(showFingersSpreadForSlapCapture: boolean) : CaptureEngineConfigBuilder{
        this._showFingersSpreadForSlapCapture = showFingersSpreadForSlapCapture;
        return this;
    }

    /**
     * sets whether to show the name of the quality "level" for each finger when evaluated. When true, will display
     * the common readable name for the range of quality that the print's quality score falls into. By default, the only
     * quality levels that are defined are for NFIQ1 (the default quality scoring algorithm) where 1=Best, 2=Good, 3=Medium,
     * 4=Poor and 5=Worst. This can be overriden, or other named scoring types can be added by using
     * ICaptureEngineConfigBuilder.addFpInclusiveQualityMapForScoreType(String scoreTypeName, Map<Integer, QualityLevel> map).
     * This defaults to 'false'.
     * @param showFpQualityNames whether to show the name of the quality "level" for each finger when evaluated.
     * @returns builder
     */
    setShowFpQualityNames(showFpQualityNames: boolean) : CaptureEngineConfigBuilder{
        this._showFpQualityNames = showFpQualityNames;
        return this;
    }

    /**
     * sets whether to use colors during finger review representing the individual QualityLevels of the quality scoring
     * used for validation. If true, then the color representing a print's QualityLevel will be used for its location during
     * review. If false, then the default green/red color scheme will be used based on whether each print passed validation or
     * not. By default the QualityLevel colors are: Best=Green, Good=DarkGreen, Medium=Yellow, Poor=LightRed, Worst=Red. These
     * can be overridden in the application consuming this api by adding color values to the v21\base-colors.xml of the top level
     * application with the names sciometrics_slapshot_finger_quality_level_[best|good|medium|poor|worst]. By default, this is set
     * to 'false'
     * @param useQualityLevelColors sets whether to use colors during finger review representing the individual QualityLevels of the quality scoring
     * used for validation
     * @returns builder
     */
    setUseQualityLevelColors(useQualityLevelColors: boolean) : CaptureEngineConfigBuilder{
        this._useQualityLevelColors = useQualityLevelColors;
        return this;
    }

    /**
     * Not currently supported in ReactNative. Ask support for details.
     * @param validationCapturesForModelBasedCalibration 
     * @returns builder
     */
    setValidationCapturesForModelBasedCalibration(validationCapturesForModelBasedCalibration: number) : CaptureEngineConfigBuilder{
        this._validationCapturesForModelBasedCalibration = validationCapturesForModelBasedCalibration;
        return this;
    }

    /**
     * sets whether the option to set the missing fingers is visible during capture. When true, the missing fingers
     * can still be set via the individual capture request (default, true)
     * @param allowSetMissingFingersDuringCapture 
     * @returns 
     */
    setAllowSetMissingFingersDuringCapture(allowSetMissingFingersDuringCapture: boolean) : CaptureEngineConfigBuilder{
        this._allowSetMissingFingersDuringCapture = allowSetMissingFingersDuringCapture;
        return this;
    }

    /**
     * plugs in a third party native quality algorithm to be used for contacless print evaluation. Plugin must implement IFPQualityPlugin
     * in Android and its fully qualified namespace must be supplied here. See documentation for further details
     * @param fPQualityPluginClass fully qualified namespace of plugin
     * @returns 
     */
    setFPQualityPluginClass(fPQualityPluginClass: string) : CaptureEngineConfigBuilder{
        this._fPQualityPluginClass = fPQualityPluginClass;
        return this;
    }

    /**
     * adds a mapping of a quality value threshold to a QualityLevel for a given score type (by the score type's name). The
     * mapping sets the (inclusive) threshold for a given QualityLevel. For example, if a scoring type had a
     * range between [0,100] where a higher score was better, and 5 QualityLevels are wanting to be defined as:
     * QualityLevel.Best=(80,100], QualityLevel.Good=(60,80], QualityLevel.Medium=(40,60], QualityLevel.Poor=(20,40], QualityLevel.Worst=[0,20]
     * then the valid definition of the 'map' would be {{Best,81}, {Good,61}, {Medium,41}, {Poor,21}, {Worst,0}}, such that the thresholds
     * are on the lower, inclusive bounds of the range of the QualityLevel. If a scoring type had a range between [1,10] where a lower
     * score is better and 3 QualityLevels are wanting to be defined as: QualityLevel.Best=[1,3], QualityLevel.Medium=(3,6], QualityLevel.Poor=(6,10],
     * then the valid definition of the 'map' would be {{{Best,3}, {Medium,6}, {Worst,10}}, such that the thresholds are on the upper, inclusive
     * bounds of teh range of the QualityLevel. Not all 5 available QualityLevels need to be represented in the map, nor do the elements
     * need to be in any order. By default, just the levels for the default scoring algorithm (NFIQ1) are set such that
     * QualityLevel.Best=[1,1], QualityLevel.Good=[2,2], QualityLevel.Medium=[3,3], QualityLevel.Poor=[4,4], QualityLevel.Worst=[5,5]. This
     * can be overriden by using addFpInclusiveQualityMapForScoreType("NFIQ",map).
     * are wanting to be defined
     * @param scoreTypeName name of the score type (e.g. NFIQ)
     * @param map map from quality value to what the QualityLevel is
     * @returns builder
     */
    addFpInclusiveQualityMapForScoreType(scoreTypeName: string,  map: Map<number, QualityLevel>) : CaptureEngineConfigBuilder{
        if (!this._fpInclusiveQualityMapForScoreTypes) {
            this._fpInclusiveQualityMapForScoreTypes = new Map<string,Map<number,QualityLevel>>();
        }

        this._fpInclusiveQualityMapForScoreTypes.set(scoreTypeName, map);

        return this;
    }

    /**
     * sets the configuration for face captures
     * @param faceConfig the configuration for face captures
     * @returns builder
     */
    setFaceConfig(faceConfig: CaptureEngineFaceConfig) : CaptureEngineConfigBuilder{
        this._faceConfig = faceConfig;
        
        return this;
    }
}