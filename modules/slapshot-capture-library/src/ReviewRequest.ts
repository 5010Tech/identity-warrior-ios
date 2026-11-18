
/**
 * The request object for reviewing a CapturedModality from an identity. Used in calls
 * to SlapshotCaptureEngineUI#runReviewCapturedModality
 */
export default class ReviewRequest {

    /**
     * gets the unique id of the identity
     *
     * - Returns: the unique id of the identity
     */
    public readonly identityId: String;
    /**
     * gets the unique id of the CapturedModality to be reviewed
     *
     * - Returns: the unique id of the CapturedModality to be reviewed
     */
    public readonly capturedModalityId: String;
    /**
     * gets whether the ReviewRequest is mutable. If false, nothing in the capture
     * review can be edited (such as finger position/meta, digital lift ROI, etc). However, the capture can still be deleted.
     *
     * - Returns: whether the ReviewRequest is mutable
     */
    public readonly isMutable: boolean | undefined;
    /**
     * gets whether an actual photo of the captured biometric will be shown in the review (true), or just a graphic
     * representing the results (false). This setting is only effective for certain biometrics (e.g. slap captures)
     *
     * - Returns: whether an actual photo of the captured biometric will be shown in the review
     */
    public readonly showImagesInReview: boolean | undefined;


    constructor(
        identityId: String,
        capturedModalityId: String,
        isMutable: boolean | undefined,
        showImagesInReview: boolean | undefined
        ) {
        this.identityId = identityId;
        this.capturedModalityId = capturedModalityId;
        this.isMutable = isMutable;
        this.showImagesInReview = showImagesInReview;
    }
}