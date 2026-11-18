import CaptureError from "./CaptureError";
import SlapshotCaptureIdentity from "./SlapshotCaptureIdentity";

export default class SlapshotCaptureError {
    captureIdentity?: SlapshotCaptureIdentity = undefined;
    captureError: CaptureError = CaptureError.Error;
    error?: string = undefined;

    constructor(obj: {captureIdentity?: SlapshotCaptureIdentity, captureError: CaptureError, error?: string}) {
        this.captureIdentity = obj.captureIdentity;
        this.captureError = obj.captureError;
        this.error = obj.error;
    }

    static fromErrorMessage(error: string): SlapshotCaptureError {
        return new SlapshotCaptureError({
            captureError: CaptureError.Error,
            error: error
        });
    }

    static isError(x: object | boolean): x is SlapshotCaptureError {
        return (typeof x !== 'boolean') && (x instanceof SlapshotCaptureError);
    }
}