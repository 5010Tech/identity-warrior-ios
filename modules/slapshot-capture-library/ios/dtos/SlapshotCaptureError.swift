import Foundation

struct SlapshotCaptureError: Codable {
    var captureIdentity: CaptureIdentity?
    var captureError: CaptureError = CaptureError.error
    var error: String?
    
    init(captureIdentity: CaptureIdentity? = nil, captureError: CaptureError = CaptureError.error, error: String? = nil) {
        self.captureIdentity = captureIdentity
        self.captureError = captureError
        self.error = error
    }
    
    public init(error: String) {
        self.captureIdentity = CaptureIdentity()
        self.captureError = CaptureError.error
        self.error = error
    }
}

extension SlapshotCaptureError {
    static func Cancelled(error: String? = nil) -> SlapshotCaptureError {
        return SlapshotCaptureError(captureIdentity: nil, captureError: CaptureError.cancelled, error: error)
    }
    
    static func FromError(error: String? = nil) -> SlapshotCaptureError {
        return SlapshotCaptureError(captureIdentity: nil, captureError: CaptureError.error, error: error)
    }
}
