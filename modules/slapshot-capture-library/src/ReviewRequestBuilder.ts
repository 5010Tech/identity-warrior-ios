import ReviewRequest from "./ReviewRequest";

export default class ReviewRequestBuilder {
    private _identityId: String;
    private _capturedModalityId: String;
    private _isMutable: boolean | undefined;
    private _showImagesInReview: boolean | undefined;

    protected constructor(identityId: String, captureModalityId: String){
        this._identityId = identityId;
        this._capturedModalityId = captureModalityId;
    }

    public static create(identityId: String, captureModalityId: String): ReviewRequestBuilder {
        return new ReviewRequestBuilder(identityId, captureModalityId);
    }

    public build(): ReviewRequest {
        return new ReviewRequest(
            this._identityId,
            this._capturedModalityId,
            this._isMutable,
            this._showImagesInReview);
    }

    /**
     * sets whether the ReviewRequest is mutable (default, false). If false, nothing in the capture.
     * @param isMutable whether the ReviewRequest is mutable (default, false)
     *
     * - Returns: builder
     */
    public setIsMutable(isMutable: boolean) : ReviewRequestBuilder {
        this._isMutable = isMutable;
        return this;
    }

    /**
     * sets whether an actual photo of the captured biometric will be shown in the review (true), or just a graphic
     * representing the results (false) (default, false). This setting is only effective for certain biometrics (e.g. slap captures)
     * @param showImagesInReview whether an actual photo of the captured biometric will be shown in the review (default, false)
     *
     * - Returns: builder
     */
    public setShowImagesInReview(showImagesInReview: boolean) : ReviewRequestBuilder {
        this._showImagesInReview = showImagesInReview;
        return this;
    }
}