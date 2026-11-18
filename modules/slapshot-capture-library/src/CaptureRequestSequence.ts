import CaptureRequest from "./CaptureRequest";
import SlapshotCaptureIdentity from "./SlapshotCaptureIdentity";
import UserMode from "./UserMode";

export default class CaptureRequestSequence {
    public readonly captureRequests: Array<CaptureRequest>;
    public readonly userMode: UserMode;
    public readonly existingCaptureIdentity: SlapshotCaptureIdentity | undefined;

    constructor(
        captureRequests: Array<CaptureRequest>,
        userMode: UserMode,
        existingCaptureIdentity: SlapshotCaptureIdentity | undefined)
    {
        this.captureRequests = captureRequests;
        this.userMode = userMode;
        this.existingCaptureIdentity = existingCaptureIdentity;
    }
}