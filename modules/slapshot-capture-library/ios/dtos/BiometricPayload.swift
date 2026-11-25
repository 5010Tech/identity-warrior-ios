import Foundation

struct BiometricPayload: Codable {
    var captureIdentity: CaptureIdentity
    var fingerprints: [Fingerprint]
    var faces: [Face]
    var digitalLifts: [DigitalLiftDto] = []
    var palms: [PalmDto] = []
}

/// A latent print captured with a DigitalLift capture request.
struct DigitalLiftDto: Codable {
    var dpi: Int
    var image: EncodedImage?
    var srcImage: EncodedImage?
}

/// A contactless palm captured with a PalmCapture capture request.
/// palmType is the SDK FingerType raw value (21 right full, 22 right writer's,
/// 23 left full, 24 left writer's).
struct PalmDto: Codable {
    var dpi: Int
    var palmType: Int
    var image: EncodedImage?
}
