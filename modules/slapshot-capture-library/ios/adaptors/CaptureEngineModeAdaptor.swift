import Foundation
import SlapshotCaptureSDK

extension CaptureEngineMode {
    func mapToSdk() -> SlapshotCaptureSDK.CaptureEngineMode {
        let sdkCaptureEngineMode: SlapshotCaptureSDK.CaptureEngineMode
        
        switch self {
        case .selfCapture:
            sdkCaptureEngineMode = SlapshotCaptureSDK.CaptureEngineMode.selfCapture
        case .administeredCapture:
            sdkCaptureEngineMode = SlapshotCaptureSDK.CaptureEngineMode.administeredCapture
        }

        return sdkCaptureEngineMode
    }
}
