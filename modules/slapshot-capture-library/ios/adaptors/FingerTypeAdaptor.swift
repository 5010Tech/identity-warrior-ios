import Foundation
import SlapshotCaptureSDK

extension FingerType {
    static func mapFromSdk(sdkFingerType: SlapshotCaptureSDK.FingerType?) -> FingerType {
        if sdkFingerType == nil {
            return .unknown
        }
        
        var newFingerType = FingerType.li
        
        switch sdkFingerType {
        case .none:
            newFingerType = FingerType.unknown
        case .unknown:
            newFingerType = FingerType.unknown
        case .rt:
            newFingerType = FingerType.rt
        case .ri:
            newFingerType = FingerType.ri
        case .rm:
            newFingerType = FingerType.rm
        case .rr:
            newFingerType = FingerType.rr
        case .rl:
            newFingerType = FingerType.rl
        case .lt:
            newFingerType = FingerType.lt
        case .li:
            newFingerType = FingerType.li
        case .lm:
            newFingerType = FingerType.lm
        case .lr:
            newFingerType = FingerType.lr
        case .ll:
            newFingerType = FingerType.ll
        case .prt:
            newFingerType = FingerType.prt
        case .plt:
            newFingerType = FingerType.plt
        case .r4fs:
            newFingerType = FingerType.r4fs
        case .l4fs:
            newFingerType = FingerType.l4fs
        case .ts:
            newFingerType = FingerType.ts
        case .rightFullPalm:
            newFingerType = FingerType.rfp
        case .rightWritersPalm:
            newFingerType = FingerType.rwp
        case .leftFullPalm:
            newFingerType = FingerType.lfp
        case .leftWritersPalm:
            newFingerType = FingerType.lwp
        case .some(_):
            newFingerType = FingerType.unknown
        }
        
        return newFingerType
    }
    
    func mapToSdk() -> SlapshotCaptureSDK.FingerType {
        let sdkFingerType: SlapshotCaptureSDK.FingerType
        
        switch self {
        case .unknown:
            sdkFingerType = SlapshotCaptureSDK.FingerType.unknown
        case .rt:
            sdkFingerType = SlapshotCaptureSDK.FingerType.rt
        case .ri:
            sdkFingerType = SlapshotCaptureSDK.FingerType.ri
        case .rm:
            sdkFingerType = SlapshotCaptureSDK.FingerType.rm
        case .rr:
            sdkFingerType = SlapshotCaptureSDK.FingerType.rr
        case .rl:
            sdkFingerType = SlapshotCaptureSDK.FingerType.rl
        case .lt:
            sdkFingerType = SlapshotCaptureSDK.FingerType.lt
        case .li:
            sdkFingerType = SlapshotCaptureSDK.FingerType.li
        case .lm:
            sdkFingerType = SlapshotCaptureSDK.FingerType.lm
        case .lr:
            sdkFingerType = SlapshotCaptureSDK.FingerType.lr
        case .ll:
            sdkFingerType = SlapshotCaptureSDK.FingerType.li
        case .prt:
            sdkFingerType = SlapshotCaptureSDK.FingerType.prt
        case .plt:
            sdkFingerType = SlapshotCaptureSDK.FingerType.plt
        case .r4fs:
            sdkFingerType = SlapshotCaptureSDK.FingerType.r4fs
        case .l4fs:
            sdkFingerType = SlapshotCaptureSDK.FingerType.l4fs
        case .ts:
            sdkFingerType = SlapshotCaptureSDK.FingerType.ts
        case .rfp:
            sdkFingerType = SlapshotCaptureSDK.FingerType.rightFullPalm
        case .rwp:
            sdkFingerType = SlapshotCaptureSDK.FingerType.rightWritersPalm
        case .lfp:
            sdkFingerType = SlapshotCaptureSDK.FingerType.leftFullPalm
        case .lwp:
            sdkFingerType = SlapshotCaptureSDK.FingerType.leftWritersPalm
        }

        return sdkFingerType
    }
}

