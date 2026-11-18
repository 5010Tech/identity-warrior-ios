import Foundation

struct CaptureModality: Codable {
    var id: String = ""
    var captureRequestType = CaptureRequestType.unknown
    var captureGroup: CaptureGroup?
}
