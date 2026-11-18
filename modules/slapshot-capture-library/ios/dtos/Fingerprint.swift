import Foundation

struct Fingerprint: Codable {
    var fingerType: FingerType
    var dpi: Int
    
    var qualityScore: FpQualityScore?
    var containedFingerLocations: [FingerprintLocation]
    var meta: BiometricMetadata
    var condition: FpCondition
    
    var image: EncodedImage?
}
