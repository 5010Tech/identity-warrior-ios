export default class BiometricMetadata {
    public readonly notes: string | undefined;

    constructor(obj:{notes: string | undefined}) {
        this.notes = obj.notes;
    }
}