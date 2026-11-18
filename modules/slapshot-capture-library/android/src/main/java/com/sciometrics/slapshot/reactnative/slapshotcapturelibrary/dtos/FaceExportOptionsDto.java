package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos;

import com.sciometrics.android.slapshot.api.capture.EncodingType;

public class FaceExportOptionsDto {
    public boolean exportCroppedFace = true;
    public int maxDimension = 0;
    public EncodingType encodingType = EncodingType.Jpg;
}
