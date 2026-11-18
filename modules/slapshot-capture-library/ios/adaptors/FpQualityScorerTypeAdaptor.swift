import Foundation
import SlapshotCaptureSDK

extension FpQualityScorerType {
    func mapToSdk() throws -> SlapshotCaptureSDK.FpQualityScorerType {
        var sdkFpQaulityScorerType: SlapshotCaptureSDK.FpQualityScorerType = .nfiq
        
        switch self {
        case .NFIQ:
            sdkFpQaulityScorerType = .nfiq
        case .Sciometrics:
            sdkFpQaulityScorerType = .contactless
        case .NFIQ2:
            throw SlapshotEngineError.unknown(message: "The Quality Scorer Type is not implemented: NFIQ2")
        }
        
        return sdkFpQaulityScorerType
    }
}
