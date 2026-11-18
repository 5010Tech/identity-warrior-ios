import Foundation

struct ExportCaptureRequest : Codable {
    var slapshotCaptureIdentity: CaptureIdentity
    var encodingType: EncodingType

    var scaleTo500dpi : Bool?
    var includeSlaps: Bool?
    var constrainSlapDimensionsTo1600x1500: Bool?
    
    var faceExportOptions: FaceExportOptions?
    var digitalLiftExportOptions: DigitalLiftExportOptions?
}
