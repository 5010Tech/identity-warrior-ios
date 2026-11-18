import Foundation
import SlapshotCaptureSDK

extension UserMode {
    func mapToSdk() -> SlapshotCaptureSDK.UserMode {
        switch(self) {
        case .administeredCapture:
            return SlapshotCaptureSDK.UserMode.AdministeredCapture
        
        case .selfCapture:
            return SlapshotCaptureSDK.UserMode.SelfCapture
        }
    }
}
