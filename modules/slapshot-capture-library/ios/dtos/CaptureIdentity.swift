import Foundation

struct CaptureIdentity: Codable {
    public var id: String = ""
    public var capturedModalities: [CaptureModality] = []
}
