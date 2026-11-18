import { EncodingType } from ".";

export default class FaceExportOptions {
    public exportCroppedFace: boolean = true;
    public maxDimension: number = 0;
    public encodingType: EncodingType = EncodingType.Jpg;
}