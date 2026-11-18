package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos;

import com.sciometrics.android.slapshot.api.capture.ICaptureRequestSequence;

public class CaptureBiometricsRequestDto {
    public final int viewId;
    public final ICaptureRequestSequence captureRequestSequence;

    public CaptureBiometricsRequestDto(int viewId, ICaptureRequestSequence captureRequestSequence) {
        this.viewId = viewId;
        this.captureRequestSequence = captureRequestSequence;
    }
}
