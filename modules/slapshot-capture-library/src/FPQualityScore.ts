export default class FPQualityScore {
    public readonly type: string;
    public readonly quality: number;
    public readonly scoreMin: number;
    public readonly scoreMax: number;
    public readonly isHigherScoreBetter: boolean;

    constructor(obj: {type: string, quality: number, scoreMin: number, scoreMax: number, isHigherScoreBetter: boolean}) {
        this.type = obj.type;
        this.quality = obj.quality;
        this.scoreMin = obj.scoreMin;
        this.scoreMax = obj.scoreMax;
        this.isHigherScoreBetter = obj.isHigherScoreBetter;
    }
}