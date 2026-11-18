import CaptureRequest from "./CaptureRequest";
import CaptureRequestSequence from "./CaptureRequestSequence";
import SlapshotCaptureIdentity from "./SlapshotCaptureIdentity";
import UserMode from "./UserMode";

export default class CaptureRequestSequenceBuilder {
    private _captureRequests: Array<CaptureRequest> = []
    private _userMode: UserMode;
    private _existingCaptureIdentity: SlapshotCaptureIdentity | undefined;

    private constructor(userMode: UserMode){
        this._userMode = userMode;
    }

    public static create(userMode: UserMode): CaptureRequestSequenceBuilder {
        return new CaptureRequestSequenceBuilder(userMode);
    }

    public build(): CaptureRequestSequence {
        return new CaptureRequestSequence(this._captureRequests, this._userMode, this._existingCaptureIdentity);
    }

    /**
     * appends a capture request to the sequence.
     * @param captureRequest 
     * @returns 
     */
    public addCaptureRequest(captureRequest: CaptureRequest): CaptureRequestSequenceBuilder {
        this._captureRequests.push(captureRequest);
        return this;
    }

    /**
     * sets an existing capture identity that the biometrics collected by this sequence will be appended to
     * @param existingCaptureIdentity 
     * @returns 
     */
    public addExistingCaptureIdentity(existingCaptureIdentity: SlapshotCaptureIdentity): CaptureRequestSequenceBuilder {
        this._existingCaptureIdentity = existingCaptureIdentity;
        return this;
    }
}