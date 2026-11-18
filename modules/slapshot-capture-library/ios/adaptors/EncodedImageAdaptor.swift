import Foundation
import SlapshotCaptureSDK

extension EncodedImage {
    static func mapFromSdk(sdkEncodedImage: SlapshotCaptureSDK.EncodedImage) -> EncodedImage {
        let encodedImage = EncodedImage(
            height: sdkEncodedImage.height,
            width: sdkEncodedImage.width,
            encodingType: EncodingType.mapFromSdk(sdkEncodingType: sdkEncodedImage.encodingType),
            imageBytesBase64: (sdkEncodedImage.data?.base64EncodedString())!)
        
        return encodedImage
    }
}
