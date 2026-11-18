import Foundation

struct FpQualityScore: Codable {
    var type: String
    
    var quality: Int
    
    var scoreMin: Int
    
    var scoreMax: Int
    
    var isHigherScoreBetter: Bool
}
