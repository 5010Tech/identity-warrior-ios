/**
 * The quality scorer type that contactless fingerprints will be evaluated with
 * @property NFIQ - NFIQ1 score [5,1]. Requires inclusion of sciometrics-nfiq-[Version].aar in app gradle file
 * @property Sciometrics - proprietary contactless fingerprint quality algorithm on the range [0,100]
 * @property NFIQ2 - NFIQ2 score [0,100]. Requires inclusion of sciometrics-nfiq2-[Version].aar in app gradle file
 */
enum FpQualityScorerType {
    NFIQ = "NFIQ",
    Sciometrics = "Sciometrics",
    NFIQ2 = "NFIQ2",
}

export default FpQualityScorerType;