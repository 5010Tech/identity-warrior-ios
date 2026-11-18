import ReviewRequest from "./ReviewRequest"

export default class ReviewBiometricsRequest {
    public readonly reviewRequest: ReviewRequest;
    public readonly viewId: number

    constructor(reviewRequest: ReviewRequest, viewId: number) {
        this.reviewRequest = reviewRequest;
        this.viewId = viewId;
    }
}