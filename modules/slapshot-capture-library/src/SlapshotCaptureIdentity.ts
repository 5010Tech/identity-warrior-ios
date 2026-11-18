import SlapshotCaptureModality from "./SlapshotCaptureModality";

export default class SlapshotCaptureIdentity {
    id: string = "";
    capturedModalities: SlapshotCaptureModality[] = [];

    constructor(obj: { id: string, capturedModalities: SlapshotCaptureModality[]}){
        this.capturedModalities = [];
        obj.capturedModalities.forEach((next)=>{
            this.capturedModalities.push(new SlapshotCaptureModality(next));
        });
        
        this.id = obj.id;
    }

    public isValid(): boolean {
        return this.id.length > 0;
    }
}