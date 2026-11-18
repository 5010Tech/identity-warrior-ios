import Foundation
import SlapshotCaptureSDK

extension EncodingType {
    static func mapFromSdk(sdkEncodingType: SlapshotCaptureSDK.EncodingType) -> EncodingType {
        switch sdkEncodingType {
        case .jpg:
            return EncodingType.jpg
        case .raw:
            return EncodingType.raw
        case .png:
            return EncodingType.png
        case .wsq:
            return EncodingType.wsq
        }
    }
    
    func mapToSdk() throws -> SlapshotCaptureSDK.EncodingType {
        let sdkEncodingType: SlapshotCaptureSDK.EncodingType
        
        switch self {
        case .unknown:
            throw SlapshotEngineError.unknown(message: "Encoding type unknown can't be converted into SDK type.")
        case .jpg:
            sdkEncodingType = SlapshotCaptureSDK.EncodingType.jpg
        case .raw:
            sdkEncodingType = SlapshotCaptureSDK.EncodingType.raw
        case .png:
            sdkEncodingType = SlapshotCaptureSDK.EncodingType.png
        case .wsq:
            sdkEncodingType = SlapshotCaptureSDK.EncodingType.wsq
        }
        
        return sdkEncodingType
    }

}
