package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos;

import com.sciometrics.android.slapshot.api.capture.FingerType;

public class FingerprintLocationDto {
    public final FingerType fingerType;
    public final int l;
    public final int r;
    public final int t;
    public final int b;
    public final int w;
    public final int h;
    public final FPQualityScoreDto qualityScore;

    public FingerprintLocationDto(
            FingerType fingerType,
            int l,
            int t,
            int r,
            int b,
            int w,
            int h,
            FPQualityScoreDto qualityScore
    ) {
        this.fingerType = fingerType;
        this.l = l;
        this.t = t;
        this.r = r;
        this.b = b;
        this.w = w;
        this.h = h;
        this.qualityScore = qualityScore;
    }
}
