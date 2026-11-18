package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos;

import java.util.List;

public class CaptureIdentityDto {
    public CaptureIdentityDto(String id, List<CapturedModalityDto> capturedModalities){
        this.id = id;
        this.capturedModalities = capturedModalities;
    }
    public final String id;
    public final List<CapturedModalityDto> capturedModalities;
}
