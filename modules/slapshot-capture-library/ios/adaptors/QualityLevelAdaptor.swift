
import Foundation
import SlapshotCaptureSDK

extension QualityLevel {
    func mapToSdk() -> SlapshotCaptureSDK.QualityLevel {
        switch(self) {
        case .Best:
            return SlapshotCaptureSDK.QualityLevel.best
        case .Good:
            return SlapshotCaptureSDK.QualityLevel.good
        case .Medium:
            return SlapshotCaptureSDK.QualityLevel.medium
        case .Poor:
            return SlapshotCaptureSDK.QualityLevel.poor
        case .Worst:
            return SlapshotCaptureSDK.QualityLevel.worst
        case .Unknown:
            return SlapshotCaptureSDK.QualityLevel.unknown
        }
    }
}
