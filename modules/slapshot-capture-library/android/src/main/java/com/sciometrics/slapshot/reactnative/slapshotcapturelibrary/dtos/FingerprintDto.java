package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos;

import com.sciometrics.android.slapshot.api.capture.FingerType;
import com.sciometrics.android.slapshot.api.capture.FpCondition;

import java.util.List;

public class FingerprintDto {
    public final FingerType fingerType;
    public final int dpi;
    public final FPQualityScoreDto qualityScore;
    public final List<FingerprintLocationDto> containedFingerLocations;
    public final BiometricMetadataDto meta;
    public final FpCondition condition;
    public final ImageDto image;
    public FingerprintDto(
            FingerType fingerType,
            int dpi,
            FPQualityScoreDto qualityScore,
            List<FingerprintLocationDto> containedFingerLocations,
            BiometricMetadataDto meta,
            FpCondition condition,
            ImageDto image) {
        this.fingerType = fingerType;
        this.dpi = dpi;
        this.qualityScore = qualityScore;
        this.containedFingerLocations = containedFingerLocations;
        this.meta = meta;
        this.condition = condition;
        this.image = image;
    }
}
