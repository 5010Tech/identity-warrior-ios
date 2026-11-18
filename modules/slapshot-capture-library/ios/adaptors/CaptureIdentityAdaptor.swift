import Foundation
import SlapshotCaptureSDK

extension CaptureIdentity {
    
    static func mapFromSdk(sdkIdentity: SlapshotCaptureSDK.CaptureIdentity) -> CaptureIdentity {
        var capturedModalities: [CaptureModality] = []
        
        sdkIdentity.capturedModalities.forEach { capturedModality in
            let newCapturedModality = CaptureModality.mapFromSdk(sdkModality: capturedModality)
            capturedModalities.append(newCapturedModality)
        }
        
        let newIdentity = CaptureIdentity(id: sdkIdentity.id, capturedModalities: capturedModalities)
        
        return newIdentity
    }
    
    func mapToSdk() -> SlapshotCaptureSDK.CaptureIdentity {
        var sdkCapturedModalities: [SlapshotCaptureSDK.CapturedModality] = []
        
        self.capturedModalities.forEach { (capturedModality) in

            let sdkCapturedModality = capturedModality.mapToSdk()
            sdkCapturedModalities.append(sdkCapturedModality)
        }
        
        let sdkIdentity = _SlapshotSDK.getEngine().createCaptureIdentity(
            id: self.id,
            captureModalities: sdkCapturedModalities)
        
        return sdkIdentity
    }
}
