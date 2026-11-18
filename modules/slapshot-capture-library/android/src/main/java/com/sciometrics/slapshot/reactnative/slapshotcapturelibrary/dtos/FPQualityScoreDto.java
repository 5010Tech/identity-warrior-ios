package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos;

public class FPQualityScoreDto {
    public final String type;
    public final int quality;
    public final int scoreMin;
    public final int scoreMax;
    public final boolean isHigherScoreBetter;

    public FPQualityScoreDto(
            String type,
            int quality,
            int scoreMin,
            int scoreMax,
            boolean isHigherScoreBetter
    ) {
        this.type = type;
        this.quality = quality;
        this.scoreMin = scoreMin;
        this.scoreMax = scoreMax;
        this.isHigherScoreBetter = isHigherScoreBetter;
    }
}
