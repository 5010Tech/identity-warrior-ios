import CaptureRequestBuilder from "./CaptureRequestBuilder";
import CaptureRequestType from "./CaptureRequestType";
import FaceCaptureRequest from "./FaceCaptureRequest";
import { FingerType } from ".";

export default class FaceCaptureRequestBuilder extends CaptureRequestBuilder {
    private _isLandscape: boolean | undefined;

    private constructor(captureRequestType: CaptureRequestType) {
        super(captureRequestType);
    }

    public static create(): FaceCaptureRequestBuilder {
        return new FaceCaptureRequestBuilder(CaptureRequestType.Face);
    }

    build(): FaceCaptureRequest {
        return new FaceCaptureRequest(
            this._captureRequestType,
            this._reviewCapture,
            this._showCaptureImageInReview,
            undefined,
            undefined,
            this._allowUserToChangeTorchSetting,
            this._defaultTorchSetting,
            this._isLandscape
        );
    }

    /**
     * sets whether to capture the face in landscape or portrait mode
     * @param isLandscape 
     * @returns 
     */
    setIsLandscape(isLandscape: boolean): FaceCaptureRequestBuilder{
        this._isLandscape = isLandscape;
        return this;
    }
}