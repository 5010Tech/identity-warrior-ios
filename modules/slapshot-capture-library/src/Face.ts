import Image from "./Image";

export default class Face{
    image: Image | undefined = undefined;

    constructor(obj: {image: Image | undefined}) {
        this.image = obj.image;
    }
}