package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos;

import com.sciometrics.android.slapshot.api.capture.EncodingType;

public class DigitalLiftExportOptionsDto {
    public EncodingType encodingType = EncodingType.Png;
    public boolean exportSource = false;
    public EncodingType sourceEncodingType = EncodingType.Jpg;
}
