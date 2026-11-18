import Foundation
import SlapshotCaptureSDK

extension CaptureAndFingerType {
    static func mapFromSdk(sdkCaptureAndFingerType: SlapshotCaptureSDK.CaptureAndFingerType) throws -> CaptureAndFingerType {
        var newCaptureAndFingerType: CaptureAndFingerType
        
        do {            
            newCaptureAndFingerType = CaptureAndFingerType(
                captureType: try CaptureType.mapFromSdk(sdkCaptureType: sdkCaptureAndFingerType.captureType),
                fingerType: FingerType.mapFromSdk(sdkFingerType: sdkCaptureAndFingerType.fingerType))
            
            return newCaptureAndFingerType
        }
        
        catch let error {
            throw error
        }
    }
}
