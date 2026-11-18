import Foundation
import SlapshotCaptureSDK

extension CaptureType {
    static func mapFromSdk(sdkCaptureType: SlapshotCaptureSDK.CaptureType) -> CaptureType {
        var newCaptureType: CaptureType = CaptureType.unknown
        
        switch sdkCaptureType {
        case .face:
            newCaptureType = CaptureType.face
        case .slapLeft:
            newCaptureType = CaptureType.slapLeft
        case .slapRight:
            newCaptureType = CaptureType.slapRight
        case .thumbs:
            newCaptureType = CaptureType.thumbs
        case.singleFinger:
            newCaptureType = CaptureType.singleFinger
        case .digitalLift:
            newCaptureType = CaptureType.digitalLift
        case .palm:
            newCaptureType = CaptureType.palm
        }
        
        return newCaptureType
    }
}
