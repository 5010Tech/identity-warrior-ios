import CaptureRequestSequence from "./CaptureRequestSequence"

export default class CaptureBiometricsRequest {
    public readonly captureRequestSequence: CaptureRequestSequence;
    public readonly viewId: number

    constructor(captureRequestSequence: CaptureRequestSequence, viewId: number) {
        this.captureRequestSequence = captureRequestSequence;
        this.viewId = viewId;
    }
}