import Foundation
import SlapshotCaptureSDK

extension CaptureRequestType {
    static func mapFromSdk(captureRequestType: SlapshotCaptureSDK.CaptureRequestType) -> CaptureRequestType {
        var newCaptureRequestType: CaptureRequestType = CaptureRequestType.unknown
        
        switch captureRequestType {
        case .calibration:
            newCaptureRequestType = CaptureRequestType.calibration
               
        case .leftSlap:
            newCaptureRequestType = CaptureRequestType.leftSlap
            
        case .rightSlap:
            newCaptureRequestType = CaptureRequestType.rightSlap

        case .face:
            newCaptureRequestType = CaptureRequestType.face
            
        case .singleFingerCapture:
            newCaptureRequestType = CaptureRequestType.singleFingerCapture

        case .thumbsSlap:
            newCaptureRequestType = CaptureRequestType.thumbsSlap

        case .digitalLift:
            newCaptureRequestType = CaptureRequestType.digitalLift
            
        case .palmCapture:
            newCaptureRequestType = CaptureRequestType.palmCapture
        }
        
        return newCaptureRequestType
    }
    
    func mapToSdk() -> SlapshotCaptureSDK.CaptureRequestType {
        var sdkCaptureRequestType: SlapshotCaptureSDK.CaptureRequestType = SlapshotCaptureSDK.CaptureRequestType.leftSlap
                
        switch self {
        case .unknown:
            sdkCaptureRequestType = SlapshotCaptureSDK.CaptureRequestType.leftSlap
        case .leftSlap:
            sdkCaptureRequestType = SlapshotCaptureSDK.CaptureRequestType.leftSlap
        case .rightSlap:
            sdkCaptureRequestType = SlapshotCaptureSDK.CaptureRequestType.rightSlap
        case .thumbsSlap:
            sdkCaptureRequestType = SlapshotCaptureSDK.CaptureRequestType.thumbsSlap
        case .singleFingerCapture:
            sdkCaptureRequestType = SlapshotCaptureSDK.CaptureRequestType.singleFingerCapture
        case .face:
            sdkCaptureRequestType = SlapshotCaptureSDK.CaptureRequestType.face
        case .calibration:
            sdkCaptureRequestType = SlapshotCaptureSDK.CaptureRequestType.calibration
        case .digitalLift:
            sdkCaptureRequestType = SlapshotCaptureSDK.CaptureRequestType.digitalLift
        case .palmCapture:
            sdkCaptureRequestType = SlapshotCaptureSDK.CaptureRequestType.palmCapture
        }
        
        return sdkCaptureRequestType
    }
}
