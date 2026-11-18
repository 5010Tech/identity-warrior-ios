import { EncodingType } from ".";

export default class DigitalLiftExportOptions {
    public encodingType: EncodingType = EncodingType.Png;
    public exportSource: boolean = false;
    public sourceEncodingType: EncodingType = EncodingType.Jpg;
}