import FPQualityScore from "./FPQualityScore";
import FingerType from "./FingerType";

export default class FingerprintLocation {
    public readonly fingerType: FingerType;
    public readonly l: number;
    public readonly t: number;
    public readonly r: number;
    public readonly b: number;
    public readonly w: number;
    public readonly h: number;
    public readonly qualityScore: FPQualityScore | undefined;

    constructor(obj: {
        fingerType: FingerType,
        l: number,
        t: number,
        r: number,
        b: number,
        w: number,
        h: number,
        qualityScore: FPQualityScore | undefined
    }) {
        this.fingerType = obj.fingerType;
        this.l = obj.l;
        this.t = obj.t;
        this.r = obj.r;
        this.b = obj.b;
        this.w = obj.w;
        this.h = obj.h;
        this.qualityScore = obj.qualityScore;
    }
}