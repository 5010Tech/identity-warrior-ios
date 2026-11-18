import Foundation
import SlapshotCaptureSDK

extension FpCondition {
    static func mapFromSdk(sdkFpCondition: SlapshotCaptureSDK.FpCondition) -> FpCondition {
        var newFpCondition = FpCondition.cannotImage
        
        switch sdkFpCondition {
        case .normal:
            newFpCondition = FpCondition.normal
        case .missing:
            newFpCondition = FpCondition.missing
        case .cannotImage:
            newFpCondition = FpCondition.cannotImage
        }
        
        return newFpCondition
    }
    
    func mapToSdk() -> SlapshotCaptureSDK.FpCondition {
        switch self {
            
        case .normal:
            return .normal
        case .missing:
            return .missing
        case .cannotImage:
            return .cannotImage
        }
    }
}
