import Foundation

struct CaptureRequestSequence: Decodable {
    var userMode: UserMode
    var captureRequests: [CaptureRequest]?
    var existingCaptureIdentity: CaptureIdentity?
}
