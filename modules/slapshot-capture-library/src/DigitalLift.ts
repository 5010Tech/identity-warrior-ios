import BiometricMetadata from "./BiometricMetadata";
import Image from "./Image";

export default class DigitalLift{
    dpi: number;
    meta: BiometricMetadata | undefined;
    image: Image | undefined = undefined;
    srcImage: Image | undefined = undefined;

    constructor(obj: {dpi: number, meta: BiometricMetadata  | undefined, image: Image | undefined, srcImage: Image | undefined}) {
        this.dpi = obj.dpi;
        this.meta = obj.meta;
        this.image = obj.image;
        this.srcImage = obj.srcImage;
    }
}