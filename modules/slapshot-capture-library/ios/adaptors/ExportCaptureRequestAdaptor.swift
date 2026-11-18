import Foundation
import SlapshotCaptureSDK

extension ExportCaptureRequest {
    func mapToSdk(progresssCallback: @escaping (Int) -> Void) -> SlapshotCaptureSDK.ExportCaptureRequest {
        
        let sdkIdentity = self.slapshotCaptureIdentity.mapToSdk()
        
        let slapshotCaptureEngine = SlapshotSDK.getEngine()
        var builder = slapshotCaptureEngine.createNewExportCaptureRequestBuilder(captureIdentity: sdkIdentity)
        if let scaleTo500dpi = scaleTo500dpi {
            builder = builder.setScaleTo500Dpi(scaleTo500dpi)
        }
        
        if let includeSlaps = includeSlaps {
            builder = builder.setIncludeSlaps(includeSlaps)
        }
        
        if let constrainSlapDimensionsTo1600x1500 = constrainSlapDimensionsTo1600x1500 {
            builder = builder.setConstrainSlapDimensionsTo1600x1500(constrainSlapDimensionsTo1600x1500)
        }
        
        builder = builder.setProgressCallback(progresssCallback)
        
        return builder.build()
    }
}
