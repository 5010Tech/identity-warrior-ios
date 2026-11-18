import CaptureEngineFaceConfig from "./CaptureEngineFaceConfig";

export default class CaptureEngineFaceConfigBuilder {
    private _autoCaptureFaceAfterValidation: boolean | undefined;
    private _minFaceWidthInPixels: number | undefined;
    private _minFaceWidthToMinorImageAxisRatio: number | undefined;
    private _maxFaceWidthInPixels: number | undefined;
    private _maxFaceWidthToMinorImageAxisRatio: number | undefined;
    private _requiredMillisecondsOfValidFacesBeforeCapture: number | undefined;
    private _faceExportPaddingFactor: number | undefined;
    private _faceExportHeightToWidthFactor: number | undefined;
    private _showDebugFaceCaptureOverlays: boolean | undefined;

    private constructor() {

    }

    static create(): CaptureEngineFaceConfigBuilder {
        return new CaptureEngineFaceConfigBuilder();
    }

    build(): CaptureEngineFaceConfig {
        return new CaptureEngineFaceConfig(
            this._autoCaptureFaceAfterValidation,
            this._minFaceWidthInPixels,
            this._minFaceWidthToMinorImageAxisRatio,
            this._maxFaceWidthInPixels,
            this._maxFaceWidthToMinorImageAxisRatio,
            this._requiredMillisecondsOfValidFacesBeforeCapture,
            this._faceExportPaddingFactor,
            this._faceExportHeightToWidthFactor,
            this._showDebugFaceCaptureOverlays
        )
    }

    /**
     * sets whether the face capture will be trigger automatically when the face is
     * validated. If false, validation will still occur, but the capture sequence is manually triggered
     * by the user pressing a button. If true, the user can still manually trigger the capture if the
     * auto-capture has not yet triggered. (true, by default)
     * @param autoCaptureFaceAfterValidation 
     * @returns 
     */
    setAutoCaptureFaceAfterValidation(autoCaptureFaceAfterValidation: boolean) : CaptureEngineFaceConfigBuilder {
        this._autoCaptureFaceAfterValidation = autoCaptureFaceAfterValidation;
        return this;
    }

    /**
     * sets the minimum number of pixels wide a face must be to be 'valid'. If less than or equal to 0,
     * this setting is ignored. If greater than 0, then the minimum will be enforced (and any setting in
     * getMinFaceWidthToMinorImageAxisRatio() will be ignored). Default is 0
     * @param minFaceWidthInPixels 
     * @returns 
     */
    setMinFaceWidthInPixels(minFaceWidthInPixels: number) : CaptureEngineFaceConfigBuilder{
        this._minFaceWidthInPixels = minFaceWidthInPixels;
        return this;
    }
    
    /**
     * sets the ratio between a captured face and the image's minor axis which determines the minimum
     * 'valid' face size. The minor axis is the shortest dimension of the captured image. Using this value
     * for the ratio keeps the capture consistent when capturing in landscape or portrait mode. If this value is,
     * for example, 0.25, and the capture dimensions are 4032x3024, then the minimum face width would be 3024px * 0.25 = 756px.
     * If this value <= 0, then it is ignored. If both getMinFaceWidthToMinorImageAxisRatio() and getMinFaceWidthInPixels() are
     * greater than 0, then this value is ignored. The default is 0.25f
     * @param minFaceWidthToMinorImageAxisRatio 
     * @returns 
     */
    setMinFaceWidthToMinorImageAxisRatio(minFaceWidthToMinorImageAxisRatio: number) : CaptureEngineFaceConfigBuilder{
        this._minFaceWidthToMinorImageAxisRatio = minFaceWidthToMinorImageAxisRatio;
        return this;
    }

    /**
     * sets the maximum number of pixels wide a face can be to be 'valid'. If less than or equal to 0,
     * this setting is ignored. If greater than 0, then the maximum will be enforced (and any setting in
     * getMaxFaceWidthToMinorImageAxisRatio() will be ignored). Default is 0
     * @param maxFaceWidthInPixels 
     * @returns 
     */
    setMaxFaceWidthInPixels(maxFaceWidthInPixels: number) : CaptureEngineFaceConfigBuilder{
        this._maxFaceWidthInPixels = maxFaceWidthInPixels;
        return this;
    }

    /**
     * gets the ratio between a captured face and the image's minor axis which determines the maximum
     * 'valid' face size. The minor axis is the shortest dimension of the captured image. Using this value
     * for the ratio keeps the capture consistent when capturing in landscape or portrait mode. If this value is,
     * for example, 0.75, and the capture dimensions are 4032x3024, then the minimum face width would be 3024px * 0.75 = 2268px.
     * If this value <= 0, then it is ignored. If both getMaxFaceWidthToMinorImageAxisRatio() and getMaxFaceWidthInPixels() are
     * greater than 0, then this value is ignored. The default is 0.75f.
     * @param maxFaceWidthToMinorImageAxisRatio 
     * @returns 
     */
    setMaxFaceWidthToMinorImageAxisRatio(maxFaceWidthToMinorImageAxisRatio: number) : CaptureEngineFaceConfigBuilder{
        this._maxFaceWidthToMinorImageAxisRatio = maxFaceWidthToMinorImageAxisRatio;
        return this;
    }

    /**
     * gets the milliseconds of consecutive validated faces that must be acquired in order to trigger
     * auto capture. If auto capture is disabled, then validation still occurs, and the user we be notified
     * they should manually trigger the capture. The user can manually trigger the capture before this requirement
     * is met. This requirement is based on a timeframe and not number of times an actual captured face is validated. This
     * is to make the capture sequence feel the same across devices. This timeframe should be long enough to ensure that an
     * adequate number of faces are validated on lower end devices. The default value is 1500.
     * @param requiredMillisecondsOfValidFacesBeforeCapture 
     * @returns 
     */
    setRequiredMillisecondsOfValidFacesBeforeCapture(requiredMillisecondsOfValidFacesBeforeCapture: number) : CaptureEngineFaceConfigBuilder{
        this._requiredMillisecondsOfValidFacesBeforeCapture = requiredMillisecondsOfValidFacesBeforeCapture;
        return this;
    }

    /**
     * gets the factor used to expand a captured face's width for exporting purposes. The face capture process is tightly bound
     * to the dimensions of the captured face. This setting allows the width of the bounding box of the face to be padded by multiplying the
     * width of the face by a factor when exporting a cropped image of the face. This is also used when displaying the captured
     * face in the review capture view. This is used in tandem with getFaceExportHeightToWidthFactor(). Default value is 1.5f, so if the
     * getFaceExportPaddingFactor() is 1.5f, and the real face width is 100px, then the width of the exported face would be 100px*1.5=150px
     * @param faceExportPaddingFactor 
     * @returns 
     */
    setFaceExportPaddingFactor(faceExportPaddingFactor: number) : CaptureEngineFaceConfigBuilder{
        this._faceExportPaddingFactor = faceExportPaddingFactor;
        return this;
    }

    /**
     * gets the factor used to expand a captured face's height for exporting purposes. The face capture process is tightly bound
     * to the dimensions of the captured face. This setting allows the height of the bounding box of the face to be padded by multiplying the
     * padded width of the face by a factor when exporting a cropped image of the face. This is also used when displaying the captured
     * face in the review capture view. This is used in tandem with getFaceExportPaddingFactor(). Default value is 1.0f, so if the
     * getFaceExportPaddingFactor() is 1.5f, and the real face width is 100px, then the width of the exported face would be 100px*1.5=150px
     * and the height of the exported face would be 1.0*(100px*1.5)=150px.
     * @param faceExportHeightToWidthFactor 
     * @returns 
     */
    setFaceExportHeightToWidthFactor(faceExportHeightToWidthFactor: number) : CaptureEngineFaceConfigBuilder{
        this._faceExportHeightToWidthFactor = faceExportHeightToWidthFactor;
        return this;
    }

    /**
     * sets whether to show face detection overlays during capture for debug purposes. This will show
     * the realtime detection of the face during the capture preview. This is 'false' by default, and should
     * only be used for debugging purposes.
     * @param showDebugFaceCaptureOverlays 
     * @returns 
     */
    setShowDebugFaceCaptureOverlays(showDebugFaceCaptureOverlays: boolean) : CaptureEngineFaceConfigBuilder{
        this._showDebugFaceCaptureOverlays = showDebugFaceCaptureOverlays;
        return this;
    }
}