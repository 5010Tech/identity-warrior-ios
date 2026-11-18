import Foundation

struct FaceExportOptions: Codable {
    var exportCroppedFace: Bool = true
    var maxDimension: Int = 0
    var encodingType: EncodingType = EncodingType.jpg
}
