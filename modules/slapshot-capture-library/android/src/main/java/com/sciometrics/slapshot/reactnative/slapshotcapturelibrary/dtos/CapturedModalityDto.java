package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos;

import com.sciometrics.android.slapshot.api.capture.CaptureRequestType;

public class CapturedModalityDto {
    public CapturedModalityDto(String id, CaptureRequestType captureRequestType){
        this.id = id;
        this.captureRequestType = captureRequestType;
    }
    public final String id;
    public final CaptureRequestType captureRequestType;
}
