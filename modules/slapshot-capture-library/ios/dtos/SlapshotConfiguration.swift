import Foundation

class SlapshotConfiguration: Decodable {
    var captureEngineMode: CaptureEngineMode?
    var numberOfRetriesForSlapCapture: Int?
    var inclusiveFingerprintQualityThreshold: Int?
    var numberOfValidFingersRequiredToAccept4Slap: Int?
    var numberOfValidFingersRequiredToAccept2Slap: Int?
    var fpQualityScorerType: FpQualityScorerType?
    var enforceFingerValidationOnReview: Bool?
    var allowFingerPositionAndSizeEditing: Bool?
    var allowCaptureInitByTap: Bool?
    var useModelBasedCalibrationByDefault: Bool?
    var enforceFingerSpreadingForSlapCapture: Bool?
    var showFingersSpreadForSlapCapture: Bool?
    var showFpQualityNames: Bool?
    var useQualityLevelColors: Bool?
    var validationCapturesForModelBasedCalibration: Int?
    var allowSetMissingFingersDuringCapture: Bool?
    var fPQualityPluginClass: String?
    var fpInclusiveQualityMapForScoreTypes: [String: [Int:QualityLevel]]?
    var faceConfig: SlapshotFaceConfiguration?
    
    enum CodingKeys: String, CodingKey {
        case captureEngineMode
        case numberOfRetriesForSlapCapture
        case inclusiveFingerprintQualityThreshold
        case numberOfValidFingersRequiredToAccept4Slap
        case numberOfValidFingersRequiredToAccept2Slap
        case fpQualityScorerType
        case enforceFingerValidationOnReview
        case allowFingerPositionAndSizeEditing
        case allowCaptureInitByTap
        case useModelBasedCalibrationByDefault
        case enforceFingerSpreadingForSlapCapture
        case showFingersSpreadForSlapCapture
        case showFpQualityNames
        case useQualityLevelColors
        case validationCapturesForModelBasedCalibration
        case allowSetMissingFingersDuringCapture
        case fPQualityPluginClass
        case fpInclusiveQualityMapForScoreTypesShim
        case faceConfig
    }
    
    required init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        captureEngineMode = try container.decodeIfPresent(CaptureEngineMode.self, forKey: .captureEngineMode)
        numberOfRetriesForSlapCapture = try container.decodeIfPresent(Int.self, forKey: .numberOfRetriesForSlapCapture)
        inclusiveFingerprintQualityThreshold = try container.decodeIfPresent(Int.self, forKey: .inclusiveFingerprintQualityThreshold)
        numberOfValidFingersRequiredToAccept4Slap = try container.decodeIfPresent(Int.self, forKey: .numberOfValidFingersRequiredToAccept4Slap)
        numberOfValidFingersRequiredToAccept2Slap = try container.decodeIfPresent(Int.self, forKey: .numberOfValidFingersRequiredToAccept2Slap)
        fpQualityScorerType = try container.decodeIfPresent(FpQualityScorerType.self, forKey: .fpQualityScorerType)
        enforceFingerValidationOnReview = try container.decodeIfPresent(Bool.self, forKey: .enforceFingerValidationOnReview)
        allowFingerPositionAndSizeEditing = try container.decodeIfPresent(Bool.self, forKey: .allowFingerPositionAndSizeEditing)
        allowCaptureInitByTap = try container.decodeIfPresent(Bool.self, forKey: .allowCaptureInitByTap)
        useModelBasedCalibrationByDefault = try container.decodeIfPresent(Bool.self, forKey: .useModelBasedCalibrationByDefault)
        enforceFingerSpreadingForSlapCapture = try container.decodeIfPresent(Bool.self, forKey: .enforceFingerSpreadingForSlapCapture)
        showFingersSpreadForSlapCapture = try container.decodeIfPresent(Bool.self, forKey: .showFingersSpreadForSlapCapture)
        showFpQualityNames = try container.decodeIfPresent(Bool.self, forKey: .showFpQualityNames)
        useQualityLevelColors = try container.decodeIfPresent(Bool.self, forKey: .useQualityLevelColors)
        validationCapturesForModelBasedCalibration = try container.decodeIfPresent(Int.self, forKey: .validationCapturesForModelBasedCalibration)
        allowSetMissingFingersDuringCapture = try container.decodeIfPresent(Bool.self, forKey: .allowSetMissingFingersDuringCapture)
        fPQualityPluginClass = try container.decodeIfPresent(String.self, forKey: .fPQualityPluginClass)
        faceConfig = try container.decodeIfPresent(SlapshotFaceConfiguration.self, forKey: .faceConfig)

        // RN->Native bridge cannot map Maps correctly, so we decode these maps of strings and ints here and rebuild our map of enums.
        // Trying to decode [String: [Int:QualityLevel]] directly does not work
        if let mapOfMaps = try container.decodeIfPresent([String:[Int:String]].self, forKey: .fpInclusiveQualityMapForScoreTypesShim) {
            var fpInclusiveQualityMapForScoreTypes = [String: [Int:QualityLevel]]()
            for map in mapOfMaps {
                var qualityMapForScoreType = [Int:QualityLevel]()
                for next in map.value {
                    if let quality = QualityLevel(rawValue: next.value) {
                        qualityMapForScoreType[next.key] = quality
                    }
                }

                fpInclusiveQualityMapForScoreTypes[map.key] = qualityMapForScoreType
            }
            self.fpInclusiveQualityMapForScoreTypes = fpInclusiveQualityMapForScoreTypes
        }
        else {
            self.fpInclusiveQualityMapForScoreTypes = nil
        }
    }
}

public class SlapshotFaceConfiguration: Codable {
    var autoCaptureFaceAfterValidation: Bool?
    var showDebugFaceCaptureOverlays: Bool?

    var minFaceWidthToMinorImageAxisRatio: Double?
    var maxFaceWidthToMinorImageAxisRatio: Double?
    var faceExportPaddingFactor: Double?
    
    var maxFaceWidthInPixels: Int?
    var requiredMillisecondsOfValidFacesBeforeCapture: Int?
    var faceExportHeightToWidthFactor: Double?
    var minFaceWidthInPixels: Int?
}
