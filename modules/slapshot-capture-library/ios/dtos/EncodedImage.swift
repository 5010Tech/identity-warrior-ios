import Foundation

struct EncodedImage: Codable {
    var height: Int
    var width: Int

    var encodingType: EncodingType
    var imageBytesBase64: String
}
