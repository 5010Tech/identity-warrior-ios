import { FpCondition } from ".";
import BiometricMetadata from "./BiometricMetadata";
import FPQualityScore from "./FPQualityScore";
import FingerType from "./FingerType";
import FingerprintLocation from "./FingerprintLocation";
import Image from "./Image";

export default class Fingerprint {
    fingerType: FingerType = FingerType.UNKNOWN;
    dpi: number = 500;
    qualityScore: FPQualityScore | undefined;
    image: Image | undefined = undefined;
    containedFingerLocations: FingerprintLocation[] | undefined;
    meta: BiometricMetadata | undefined;
    condition: FpCondition;

    constructor(obj: {
        fingerType: FingerType,
        dpi: number,
        qualityScore: FPQualityScore | undefined,
        containedFingerLocations: FingerprintLocation[] | undefined,
        meta: BiometricMetadata | undefined,
        condition: FpCondition,
        image: Image | undefined})
    {
        this.fingerType = obj.fingerType;
        this.dpi = obj.dpi;
        this.qualityScore = obj.qualityScore;
        this.containedFingerLocations = obj.containedFingerLocations;
        this.meta = obj.meta;
        this.condition = obj.condition;
        this.image = obj.image;
    }
}