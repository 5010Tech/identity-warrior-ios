import Foundation

enum CaptureType: Int, Codable {
    case unknown = -1
    case face = 4
    case singleFinger = 20
    case slapLeft = 0
    case slapRight = 1
    case thumbs = 2
    case digitalLift = 8
    case palm = 16
}
