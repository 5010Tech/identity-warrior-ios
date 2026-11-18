import Foundation

struct FingerprintLocation: Codable  {
    var fingerType: FingerType
    
    var l: Int
    var r: Int
    var t: Int
    var b: Int
    var w: Int
    var h: Int
    
    var qualityScore: FpQualityScore?
}
