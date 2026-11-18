import DigitalLift from './DigitalLift';
import Face from './Face';
import Fingerprint from './Fingerprint';
import SlapshotCaptureIdentity from './SlapshotCaptureIdentity';

export default class BiometricPayload {
    captureIdentity: SlapshotCaptureIdentity;
    fingerprints: Fingerprint[] = [];
    faces: Face[] = [];
    digitalLifts: DigitalLift[] = [];

    constructor(obj: {captureIdentity: SlapshotCaptureIdentity, fingerprints: Fingerprint[], faces: Face[], digitalLifts: DigitalLift[]}) {
        this.captureIdentity = obj.captureIdentity;
        
        this.fingerprints = [];
        obj.fingerprints?.forEach((next) =>{
            this.fingerprints.push(new Fingerprint(next));
        })

        this.faces = [];
        obj.faces?.forEach((next) => {
            this.faces.push(new Face(next));
        })

        this.digitalLifts = [];
        obj.digitalLifts?.forEach((next) => {
            this.digitalLifts.push(new DigitalLift(next));
        });
    }
}