import DigitalLiftExportOptions from "./DigitalLiftExportOptions";
import EncodingType from "./EncodingType";
import ExportCaptureRequest from "./ExportCaptureRequest";
import FaceExportOptions from "./FaceExportOptions";
import SlapshotCaptureIdentity from "./SlapshotCaptureIdentity";

export default class ExportCaptureRequestBuilder {
    private _slapshotCaptureIdentity: SlapshotCaptureIdentity;
    private _encodingType: EncodingType = EncodingType.Png;
    private _scaleTo500dpi: boolean | undefined;
    private _includeSlaps: boolean | undefined;
    private _constrainSlapDimensionsTo1600x1500: boolean | undefined;
    private _faceExportOptions: FaceExportOptions = new FaceExportOptions();
    private _digitalLiftExportOptions: DigitalLiftExportOptions = new DigitalLiftExportOptions();
    private _progressCallback: ((progress: number) => void) | undefined = undefined;

    private constructor(slapshotCaptureIdentity: SlapshotCaptureIdentity) {
        this._slapshotCaptureIdentity = slapshotCaptureIdentity;
    }

    public static create(slapshotCaptureIdentity: SlapshotCaptureIdentity): ExportCaptureRequestBuilder {
        return new ExportCaptureRequestBuilder(slapshotCaptureIdentity);
    }

    public build(): ExportCaptureRequest {
        return new ExportCaptureRequest(
            this._slapshotCaptureIdentity,
            this._encodingType,
            this._scaleTo500dpi,
            this._includeSlaps,
            this._constrainSlapDimensionsTo1600x1500,
            this._faceExportOptions,
            this._digitalLiftExportOptions,
            this._progressCallback);
    }

    /**
     * the encoding that the base64 image data will be encoded with (default Wsq)
     * @param encodingType 
     * @returns 
     */
    public setEncodingType(encodingType: EncodingType): ExportCaptureRequestBuilder{
        this._encodingType = encodingType;
        return this;
    }

    /**
     * sets whether to scale the exported finger biometrics from their native capture to a standard 500 dpi
     * @param scaleTo500dpi 
     * @returns 
     */
    public setScaleTo500dpi(scaleTo500dpi: boolean): ExportCaptureRequestBuilder {
        this._scaleTo500dpi = scaleTo500dpi;
        return this;
    }

    /**
     * sets whether to include the full slap biometrics in the export (FGP 13,14,15 etc)
     * @param includeSlaps 
     * @returns 
     */
    public setIncludeSlaps(includeSlaps: boolean): ExportCaptureRequestBuilder {
        this._includeSlaps = includeSlaps;
        return this;
    }

    /**
     * sets whether to constrain the exported full slap biometrics (FGP 13,14,15 etc) to a standard image space of 1600x1500. Fingers can
     * be moved from their native position in order to meet the constraints
     * @param constrainSlapDimensionsTo1600x1500 
     * @returns 
     */
    public setConstrainSlapDimensionsTo1600x1500(constrainSlapDimensionsTo1600x1500: boolean): ExportCaptureRequestBuilder {
        this._constrainSlapDimensionsTo1600x1500 = constrainSlapDimensionsTo1600x1500;
        return this;
    }

    /**
     * sets whether exported faces will be cropped down the just the face with a padding
     * @param exportCroppedFaces 
     * @returns 
     */
    public setFacesExportCropped(exportCroppedFaces: boolean): ExportCaptureRequestBuilder {
        this._faceExportOptions.exportCroppedFace = exportCroppedFaces;
        return this;
    }

    /**
     * sets the max dimension in pixels that the exported face will be in either dimension. If set, the exported face could be
     * downscaled to meet this constraint
     * @param maxDimension 
     * @returns 
     */
    public setFacesMaxDimension(maxDimension: number): ExportCaptureRequestBuilder {
        this._faceExportOptions.maxDimension = maxDimension;
        return this;
    }

    /**
     * the image encoding of the exported image. Can be png or jpg. (default jpg)
     * @param encoding
     * @returns 
     */
    public setFacesEncoding(encoding: EncodingType): ExportCaptureRequestBuilder {
        this._faceExportOptions.encodingType = encoding;
        return this;
    }

    /**
     * the encoding of the exported digital lift region of interest images. Can be png or jpg. (default png)
     * @param encoding
     * @returns 
     */
    public setDigitalLiftsEncoding(encoding: EncodingType): ExportCaptureRequestBuilder {
        this._digitalLiftExportOptions.encodingType = encoding;
        return this;
    }

    /**
     * whether to export the exported digital lift full images (default false)
     * @param exportSources 
     * @returns 
     */
    public setDigitalLiftsExportSources(exportSources: boolean): ExportCaptureRequestBuilder {
        this._digitalLiftExportOptions.exportSource = exportSources;
        return this;
    }

    /**
     * the encoding of the exported digital lift full images. Can be png or jpg. (default jpg)
     * @param encoding 
     * @returns 
     */
    public setDigitalLiftsSourceEncoding(encoding: EncodingType): ExportCaptureRequestBuilder {
        this._digitalLiftExportOptions.sourceEncodingType = encoding;
        return this;
    }

    /**
     * sets a callback that will be called as the export process progresses
     * @param progressCallback
     * @returns 
     */
    public setProgressCallback(progressCallback: (progress:number) => void): ExportCaptureRequestBuilder {
        this._progressCallback = progressCallback;
        return this;
    }
}