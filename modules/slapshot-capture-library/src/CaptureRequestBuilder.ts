import CaptureRequest from "./CaptureRequest";
import CaptureRequestType from "./CaptureRequestType";
import FingerType from "./FingerType";
import FpCondition from "./FpCondition";
import TorchSetting from "./TorchSetting";

export default class CaptureRequestBuilder {
    protected _captureRequestType: CaptureRequestType;
    protected _reviewCapture: boolean | undefined;
    protected _showCaptureImageInReview: boolean | undefined;
    private _singleFingerCaptureExplicitType: FingerType | undefined;
    private _missingFingerMapping: Map<FingerType,FpCondition> | undefined;
    protected _allowUserToChangeTorchSetting: boolean | undefined;
    protected _defaultTorchSetting: TorchSetting | undefined

    protected constructor(captureRequestType: CaptureRequestType){
        this._captureRequestType = captureRequestType;
    }

    public static create(captureRequestType: CaptureRequestType): CaptureRequestBuilder {
        return new CaptureRequestBuilder(captureRequestType);
    }

    public build(): CaptureRequest {
        return new CaptureRequest(
            this._captureRequestType,
            this._reviewCapture,
            this._showCaptureImageInReview,
            this._singleFingerCaptureExplicitType,
            this._missingFingerMapping,
            this._allowUserToChangeTorchSetting,
            this._defaultTorchSetting
            );
    }

    /**
     * sets whether the user will navigate to the review screen after capture. Otherwise, the capture is accepted automatically upon capture. Defaults to true.
     * @param reviewCapture 
     * @returns 
     */
    public setReviewCapture(reviewCapture: boolean) : CaptureRequestBuilder{
        this._reviewCapture = reviewCapture;
        return this;
    }

    /**
     * gets whether the review view of the capture shows the user the captured image. If false, then just a review of the evaluated qualities metrics are shown
     * instead of the captured image. Defaults to true.
     * @param showCaptureImageInReview 
     * @returns 
     */
    public setshowCaptureImageInReview(showCaptureImageInReview: boolean) : CaptureRequestBuilder{
        this._showCaptureImageInReview = showCaptureImageInReview;
        return this;
    }

    /**
     * sets the explicitly set finger type for single finger captures. Only used with {@link CaptureRequestType#SingleFingerCapture}. If omitted,
     * the user will determine which finger is captured. {@link FingerType#UNKNOWN} by default.
     * @param singleFingerCaptureExplicitType 
     * @returns 
     */
    public setSingleFingerCaptureExplicitType(singleFingerCaptureExplicitType: FingerType) : CaptureRequestBuilder{
        this._singleFingerCaptureExplicitType = singleFingerCaptureExplicitType;
        return this;
    }

    /**
     * sets a mapping for pre-known missing fingers being captured for this request. This is optional. Any finger types
     * not present in the map for fingers present in the captureType will be initialized to 'normal'. Using this option
     * does not disable the ability to change the missing fingers during the capture
     * @param missingFingerMapping 
     * @returns 
     */
    public setMissingFingerMapping(missingFingerMapping: Map<FingerType,FpCondition>) : CaptureRequestBuilder{
        this._missingFingerMapping = missingFingerMapping;
        return this;
    }

    /**
     * sets whether the user is able to change the torch/flash setting during the capture (default, false)
     * @param allowUserToChangeTorchSetting 
     * @returns 
     */
    public setAllowUserToChangeTorchSetting(allowUserToChangeTorchSetting: boolean) : CaptureRequestBuilder{
        this._allowUserToChangeTorchSetting = allowUserToChangeTorchSetting;
        return this;
    }

    /**
     * gets the default torch setting to use for the capture
     * @param defaultTorchSetting 
     * @returns 
     */
    public setDefaultTorchSetting(defaultTorchSetting: TorchSetting) : CaptureRequestBuilder{
        this._defaultTorchSetting = defaultTorchSetting;
        return this;
    }
}