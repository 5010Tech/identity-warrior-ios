package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos;

import com.sciometrics.android.slapshot.api.capture.EncodingType;

public class ImageDto {
    public final int width;
    public final int height;
    public final EncodingType encodingType;
    public final String imageBytesBase64;

    public ImageDto(int width, int height, EncodingType encodingType, String imageBytesBase64) {
        this.width = width;
        this.height = height;
        this.encodingType = encodingType;
        this.imageBytesBase64 = imageBytesBase64;
    }
}
