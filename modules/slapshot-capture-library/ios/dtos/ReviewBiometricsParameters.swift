import Foundation

struct ReviewBiometricsParameters: Decodable {
    var viewId: Int
    
    var reviewRequest: ReviewRequest?
}
