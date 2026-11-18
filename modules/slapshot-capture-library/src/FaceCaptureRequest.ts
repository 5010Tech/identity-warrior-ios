import CaptureRequest from "./CaptureRequest";
import CaptureRequestType from "./CaptureRequestType";
import FingerType from "./FingerType";
import FpCondition from "./FpCondition";
import TorchSetting from "./TorchSetting";

export default class FaceCaptureRequest extends CaptureRequest {
    public readonly isLandscape: boolean | undefined;

    constructor(
        captureRequestType: CaptureRequestType,
        reviewCapture: boolean | undefined,
        showCaptureImageInReview: boolean | undefined,
        singleFingerCaptureExplicitType: FingerType | undefined,
        missingFingerMapping: Map<FingerType,FpCondition> | undefined,
        allowUserToChangeTorchSetting: boolean | undefined,
        defaultTorchSetting: TorchSetting | undefined,
        isLandscape: boolean | undefined)
    {
        super(
            captureRequestType,
            reviewCapture,
            showCaptureImageInReview,
            singleFingerCaptureExplicitType,
            missingFingerMapping,
            allowUserToChangeTorchSetting,
            defaultTorchSetting
        );
        this.isLandscape = isLandscape;
    }
}