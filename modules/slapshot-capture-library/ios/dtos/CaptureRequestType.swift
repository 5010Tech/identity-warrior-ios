import Foundation

enum CaptureRequestType: String, Codable {
    case unknown = "Unknown"
    case leftSlap = "LeftSlap"
    case rightSlap = "RightSlap"
    case thumbsSlap = "ThumbsSlap"
    case singleFingerCapture = "SingleFingerCapture"
    case face = "Face"
    case calibration = "Calibration"
    case digitalLift = "DigitalLift"
    case palmCapture = "PalmCapture"
}
