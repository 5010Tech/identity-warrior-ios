import Image from "./Image";

/**
 * A contactless palm capture. palmType is the SDK finger type code:
 * 21 right full palm, 22 right writer's palm, 23 left full palm, 24 left writer's palm.
 */
export default class Palm {
    dpi: number;
    palmType: number;
    image: Image | undefined = undefined;

    constructor(obj: {dpi: number, palmType: number, image: Image | undefined}) {
        this.dpi = obj.dpi;
        this.palmType = obj.palmType;
        this.image = obj.image;
    }
}
