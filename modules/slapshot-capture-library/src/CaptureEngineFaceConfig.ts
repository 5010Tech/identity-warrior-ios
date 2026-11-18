export default class CaptureEngineFaceConfig {
    public readonly autoCaptureFaceAfterValidation: boolean | undefined;
    public readonly minFaceWidthInPixels: number | undefined;
    public readonly minFaceWidthToMinorImageAxisRatio: number | undefined;
    public readonly maxFaceWidthInPixels: number | undefined;
    public readonly maxFaceWidthToMinorImageAxisRatio: number | undefined;
    public readonly requiredMillisecondsOfValidFacesBeforeCapture: number | undefined;
    public readonly faceExportPaddingFactor: number | undefined;
    public readonly faceExportHeightToWidthFactor: number | undefined;
    public readonly showDebugFaceCaptureOverlays: boolean | undefined;

    constructor(
        autoCaptureFaceAfterValidation: boolean | undefined,
        minFaceWidthInPixels: number | undefined,
        minFaceWidthToMinorImageAxisRatio: number | undefined,
        maxFaceWidthInPixels: number | undefined,
        maxFaceWidthToMinorImageAxisRatio: number | undefined,
        requiredMillisecondsOfValidFacesBeforeCapture: number | undefined,
        faceExportPaddingFactor: number | undefined,
        faceExportHeightToWidthFactor: number | undefined,
        showDebugFaceCaptureOverlays: boolean | undefined
    ) {
        this.autoCaptureFaceAfterValidation = autoCaptureFaceAfterValidation;
        this.minFaceWidthInPixels = minFaceWidthInPixels;
        this.minFaceWidthToMinorImageAxisRatio = minFaceWidthToMinorImageAxisRatio;
        this.maxFaceWidthInPixels = maxFaceWidthInPixels;
        this.maxFaceWidthToMinorImageAxisRatio = maxFaceWidthToMinorImageAxisRatio;
        this.requiredMillisecondsOfValidFacesBeforeCapture = requiredMillisecondsOfValidFacesBeforeCapture;
        this.faceExportPaddingFactor = faceExportPaddingFactor;
        this.faceExportHeightToWidthFactor = faceExportHeightToWidthFactor;
        this.showDebugFaceCaptureOverlays = showDebugFaceCaptureOverlays;
    }
}