import Foundation
import SlapshotCaptureSDK

extension TorchSetting {
    func mapToSdk() -> SlapshotCaptureSDK.TorchSetting {
        switch(self) {

        case .captureDefault:
            return .captureDefault
        case .on:
            return .on
        case .off:
            return .off
        case .auto:
            return .auto
        case .remember:
            return .remember
        }
    }
}
