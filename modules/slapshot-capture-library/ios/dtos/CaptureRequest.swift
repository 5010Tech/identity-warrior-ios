import Foundation

struct CaptureRequest: Decodable {
    var captureRequestType: CaptureRequestType?
    var reviewCapture: Bool?
    var showCaptureImageInReview: Bool?
    var singleFingerCaptureExplicitType: FingerType?
    var missingFingerMapping: [FingerType:FpCondition]?
    var allowUserToChangeTorchSetting: Bool?
    var defaultTorchSetting: TorchSetting?
    
    enum CodingKeys: String, CodingKey {
        case captureRequestType
        case reviewCapture
        case showCaptureImageInReview
        case singleFingerCaptureExplicitType
        case missingFingerMappingShim
        case allowUserToChangeTorchSetting
        case defaultTorchSetting
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        captureRequestType = try container.decodeIfPresent(CaptureRequestType.self, forKey: .captureRequestType)
        reviewCapture = try container.decodeIfPresent(Bool.self, forKey: .reviewCapture)
        showCaptureImageInReview = try container.decodeIfPresent(Bool.self, forKey: .showCaptureImageInReview)
        singleFingerCaptureExplicitType = try container.decodeIfPresent(FingerType.self, forKey: .singleFingerCaptureExplicitType)
        allowUserToChangeTorchSetting = try container.decodeIfPresent(Bool.self, forKey: .allowUserToChangeTorchSetting)
        defaultTorchSetting = try container.decodeIfPresent(TorchSetting.self, forKey: .defaultTorchSetting)
        
        // RN->Native bridge cannot map Maps correctly, so we decode these maps of strings here and rebuild our map of enums.
        // Trying to decode [FingerType:FpCondition] directly does not work
        if let mapArray = try container.decodeIfPresent([String:String].self, forKey: .missingFingerMappingShim) {
            var missingFingerMapping = [FingerType:FpCondition]()
            for next in mapArray {
                if let fingerType = FingerType(rawValue: next.key),
                   let fpCondition = FpCondition(rawValue: next.value) {
                    missingFingerMapping[fingerType] = fpCondition
                }
            }
            self.missingFingerMapping = missingFingerMapping
        }
        else {
            self.missingFingerMapping = nil
        }
    }
}
