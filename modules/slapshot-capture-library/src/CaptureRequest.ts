import CaptureRequestType from "./CaptureRequestType";
import FingerType from "./FingerType";
import FpCondition from "./FpCondition";
import TorchSetting from "./TorchSetting";
import {mapToObject} from "./helpers/NativeBridgeHelper"

export default class CaptureRequest {
    public readonly captureRequestType: CaptureRequestType;
    public readonly reviewCapture: boolean | undefined;
    public readonly showCaptureImageInReview: boolean | undefined;
    public readonly singleFingerCaptureExplicitType: FingerType | undefined;
    public readonly missingFingerMapping: Map<FingerType,FpCondition> | undefined;
    public readonly allowUserToChangeTorchSetting: boolean | undefined;
    public readonly defaultTorchSetting: TorchSetting | undefined
    private readonly missingFingerMappingShim: any | undefined

    constructor(
        captureRequestType: CaptureRequestType,
        reviewCapture: boolean | undefined,
        showCaptureImageInReview: boolean | undefined,
        singleFingerCaptureExplicitType: FingerType | undefined,
        missingFingerMapping: Map<FingerType,FpCondition> | undefined,
        allowUserToChangeTorchSetting: boolean | undefined,
        defaultTorchSetting: TorchSetting | undefined
        ) {
        this.captureRequestType = captureRequestType;
        this.reviewCapture = reviewCapture;
        this.showCaptureImageInReview = showCaptureImageInReview;
        this.singleFingerCaptureExplicitType = singleFingerCaptureExplicitType;
        this.missingFingerMapping = missingFingerMapping;
        this.allowUserToChangeTorchSetting = allowUserToChangeTorchSetting;
        this.defaultTorchSetting = defaultTorchSetting;
        if (missingFingerMapping) {
            this.missingFingerMappingShim = mapToObject(missingFingerMapping)
        }
    }
}