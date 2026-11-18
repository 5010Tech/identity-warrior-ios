package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary;

import com.sciometrics.android.slapshot.api.capture.CaptureError;
import com.sciometrics.android.slapshot.api.capture.ICaptureIdentity;

public class SlapshotCaptureError {
    public SlapshotCaptureError(ICaptureIdentity captureIdentity, CaptureError captureError, String error){
        this.captureIdentity = captureIdentity;
        this.captureError = captureError;
        this.error = error;
    }

    public final ICaptureIdentity captureIdentity;
    public final CaptureError captureError;
    public final String error;
}
