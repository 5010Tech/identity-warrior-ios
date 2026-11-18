import Foundation

struct CaptureBiometricsParameters: Decodable {
    var viewId: Int
    
    var captureRequestSequence: CaptureRequestSequence?
}
