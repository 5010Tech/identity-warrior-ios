package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos;

import com.sciometrics.android.slapshot.api.capture.IReviewRequest;

public class ReviewBiometricsRequestDto {
    public final int viewId;
    public final IReviewRequest reviewRequest;

    public ReviewBiometricsRequestDto(int viewId, IReviewRequest reviewRequest) {
        this.viewId = viewId;
        this.reviewRequest = reviewRequest;
    }
}
