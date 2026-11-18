import EncodingType from "./EncodingType";

export default class Image {
    public readonly width: number;
    public readonly height: number;
    public readonly encodingType: EncodingType;
    public readonly imageBytesBase64: string;

    constructor(obj: {width: number, height: number, encodingType: EncodingType, imageBytesBase64: string})  {
        this.width = obj.width;
        this.height = obj.height;
        this.encodingType = obj.encodingType;
        this.imageBytesBase64 = obj.imageBytesBase64;
    }
}