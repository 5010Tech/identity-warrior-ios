package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos;

import com.sciometrics.android.slapshot.api.capture.CaptureError;

public class SlapshotCaptureErrorDto {
    public SlapshotCaptureErrorDto(CaptureIdentityDto captureIdentity, CaptureError captureError, String error){
        this.captureIdentity = captureIdentity;
        this.captureError = captureError;
        this.error = error;
    }

    public final CaptureIdentityDto captureIdentity;
    public final CaptureError captureError;
    public final String error;
}
