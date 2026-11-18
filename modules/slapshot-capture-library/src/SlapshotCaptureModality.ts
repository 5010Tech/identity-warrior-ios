import CaptureRequestType from './CaptureRequestType'

export default class SlapshotCaptureModality {
    id: string = "";
    captureRequestType: CaptureRequestType = CaptureRequestType.LeftSlap;

    constructor(obj: {id: string, captureRequestType: CaptureRequestType}) {
        this.id = obj.id;
        this.captureRequestType = obj.captureRequestType;
    }
}