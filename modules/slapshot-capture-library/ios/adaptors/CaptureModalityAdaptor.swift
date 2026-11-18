import Foundation
import SlapshotCaptureSDK

extension CaptureModality {
    static func mapFromSdk(sdkModality: SlapshotCaptureSDK.CapturedModality) -> CaptureModality {
        let newCapturedModality = CaptureModality(
            id: sdkModality.id,
            captureRequestType: CaptureRequestType.mapFromSdk(captureRequestType: sdkModality.captureRequestType),
            captureGroup: nil)
        
        return newCapturedModality
    }
    
    func mapToSdk() -> SlapshotCaptureSDK.CapturedModality {
        let sdkCapturedModality = _SlapshotSDK.getEngine().createCapturedModality(
            id: self.id,
            captureRequestType: self.captureRequestType.mapToSdk(),
            fingerType: nil)
        
        return sdkCapturedModality
    }
}
