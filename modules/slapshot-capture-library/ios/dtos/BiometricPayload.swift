import Foundation

struct BiometricPayload: Codable {
    var captureIdentity: CaptureIdentity
    var fingerprints: [Fingerprint]
    var faces: [Face]
}
