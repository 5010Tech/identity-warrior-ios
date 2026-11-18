package com.sciometrics.slapshot.reactnative.slapshotcapturelibrary.dtos;

import java.util.List;

public class BiometricPayloadDto {
    public final CaptureIdentityDto captureIdentity;
    public final List<FingerprintDto> fingerprints;
    public final List<FaceDto> faces;
    public final List<DigitalLiftDto> digitalLifts;

    public BiometricPayloadDto(
            CaptureIdentityDto captureIdentity,
            List<FingerprintDto> fingerprints,
            List<FaceDto> faces,
            List<DigitalLiftDto> digitalLifts) {
        this.captureIdentity = captureIdentity;
        this.fingerprints = fingerprints;
        this.faces = faces;
        this.digitalLifts = digitalLifts;
    }
}
