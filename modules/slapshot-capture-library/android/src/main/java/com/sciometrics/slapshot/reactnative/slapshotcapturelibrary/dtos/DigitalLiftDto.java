package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos;

public class DigitalLiftDto {
    public final int dpi;
    public final BiometricMetadataDto meta;
    public final ImageDto image;
    public final ImageDto srcImage;

    public DigitalLiftDto(int dpi, BiometricMetadataDto meta, ImageDto image, ImageDto srcImage) {
        this.dpi = dpi;
        this.meta = meta;
        this.image = image;
        this.srcImage = srcImage;
    }
}
