import DigitalLiftExportOptions from './DigitalLiftExportOptions';
import EncodingType from './EncodingType';
import FaceExportOptions from './FaceExportOptions';
import SlapshotCaptureIdentity from './SlapshotCaptureIdentity';

export default class ExportCaptureRequest {
    public readonly slapshotCaptureIdentity: SlapshotCaptureIdentity;
    public readonly encodingType: EncodingType;
    public readonly scaleTo500dpi: boolean | undefined;
    public readonly includeSlaps: boolean | undefined;
    public readonly constrainSlapDimensionsTo1600x1500: boolean | undefined;
    public readonly faceExportOptions: FaceExportOptions | undefined;
    public readonly digitalLiftExportOptions: DigitalLiftExportOptions | undefined;
    public readonly progressCallback: ((progress: number) => void) | undefined = undefined

    constructor(
        slapshotCaptureIdentity: SlapshotCaptureIdentity,
        encodingType: EncodingType,
        scaleTo500dpi: boolean | undefined,
        includeSlaps: boolean | undefined,
        constrainSlapDimensionsTo1600x1500: boolean | undefined,
        faceExportOptions: FaceExportOptions | undefined,
        digitalLiftExportOptions: DigitalLiftExportOptions | undefined,
        progressCallback: ((progress: number) => void) | undefined
        ) {
        this.slapshotCaptureIdentity = slapshotCaptureIdentity;
        this.encodingType = encodingType;
        this.scaleTo500dpi = scaleTo500dpi;
        this.includeSlaps = includeSlaps;
        this.constrainSlapDimensionsTo1600x1500 = constrainSlapDimensionsTo1600x1500;
        this.faceExportOptions = faceExportOptions;
        this.digitalLiftExportOptions =  digitalLiftExportOptions;
        this.progressCallback = progressCallback;
    }
}