import Foundation
import SlapshotCaptureSDK

extension CaptureGroup {
    static func mapFromSdk(sdkCaptureGroup: SlapshotCaptureSDK.CaptureGroup) throws -> CaptureGroup {
        let newCaptureGroup = CaptureGroup(
            id: sdkCaptureGroup.id,
            captureAndFingerType: try CaptureAndFingerType.mapFromSdk(sdkCaptureAndFingerType: sdkCaptureGroup.captureAndFingerType))
        
        return newCaptureGroup
    }
}
 
