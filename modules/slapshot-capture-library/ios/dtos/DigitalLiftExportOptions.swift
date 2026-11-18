import Foundation

struct DigitalLiftExportOptions: Codable {
    var encodingType: EncodingType = EncodingType.png
    var exportSource: Bool = false
    var sourceEncodingType: EncodingType = EncodingType.jpg
}
