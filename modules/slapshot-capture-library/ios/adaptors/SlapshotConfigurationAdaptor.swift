import Foundation
import SlapshotCaptureSDK

extension SlapshotConfiguration {
    func mapToSdk() -> CaptureEngineConfig {
        var configBuilder = SlapshotSDK.getEngine().createNewCaptureEngineConfigBuilder()
        if let engineMode = captureEngineMode?.mapToSdk() {
            configBuilder = configBuilder.setMode(engineMode)
        }

        if let numberOfRetriesForSlapCapture = numberOfRetriesForSlapCapture {
            configBuilder = configBuilder.setNumberOfRetriesForSlapCapture(numberOfRetriesForSlapCapture)
        }

        if let inclusiveFingerprintQualityThreshold = inclusiveFingerprintQualityThreshold {
            configBuilder = configBuilder.setInclusiveFingerprintQualityThreshold(inclusiveFingerprintQualityThreshold)
        }

        if let numberOfValidFingersRequiredToAccept4Slap = numberOfValidFingersRequiredToAccept4Slap {
            configBuilder = configBuilder.setNumberOfValidFingersRequiredToAccept4Slap(numberOfValidFingersRequiredToAccept4Slap)
        }

        if let numberOfValidFingersRequiredToAccept2Slap = numberOfValidFingersRequiredToAccept2Slap {
            configBuilder = configBuilder.setNumberOfValidFingersRequiredToAccept2Slap(numberOfValidFingersRequiredToAccept2Slap)
        }
        
        if let fPQualityPluginClass = fPQualityPluginClass,
           let nsFpQualityPluginClass = NSClassFromString(fPQualityPluginClass),
           let nsFpQualityPluginClass = nsFpQualityPluginClass as? FingerprintQualityScorer.Type {
            configBuilder = configBuilder.setFpQualityPluginClass(nsFpQualityPluginClass)
        }

        if let fpQualityScorerType = try! fpQualityScorerType?.mapToSdk() {
            configBuilder = configBuilder.setFpQualityScorerType(fpQualityScorerType)
        }

        if let showFpQualityNames = showFpQualityNames {
            configBuilder = configBuilder.setShowFpQualityNames(showFpQualityNames)
        }

        if let useQualityLevelColors = useQualityLevelColors {
            configBuilder = configBuilder.setUseQualityLevelColors(useQualityLevelColors)
        }

        if let fpInclusiveQualityMapForScoreTypes = fpInclusiveQualityMapForScoreTypes {
            configBuilder = configBuilder.setFpInclusiveQualityMapForScoreTypes(mapToSdk(fpInclusiveQualityMapForScoreTypes: fpInclusiveQualityMapForScoreTypes))
        }

        if let enforceFingerSpreadingForSlapCapture = enforceFingerSpreadingForSlapCapture {
            configBuilder = configBuilder.setEnforceFingerSpreadingForSlapCapture(enforceFingerSpreadingForSlapCapture)
        }

        if let showFingersSpreadForSlapCapture = showFingersSpreadForSlapCapture {
            configBuilder = configBuilder.setShowFingersSpreadForSlapCapture(showFingersSpreadForSlapCapture)
        }

        if let enforceFingerValidationOnReview = enforceFingerValidationOnReview {
            configBuilder = configBuilder.setEnforceFingerValidationOnReview(enforceFingerValidationOnReview)
        }

        if let allowFingerPositionAndSizeEditing = allowFingerPositionAndSizeEditing {
            configBuilder = configBuilder.setAllowFingerPositionAndSizeEditing(allowFingerPositionAndSizeEditing)
        }

        if let allowCaptureInitByTap = allowCaptureInitByTap {
            configBuilder = configBuilder.setAllowCapturInitByTap(allowCaptureInitByTap)
        }
        
        if let sdkFaceConfig = faceConfig?.mapToSdk() {
            configBuilder = configBuilder.setFaceConfig(sdkFaceConfig)
        }

        if let useModelBasedCalibrationByDefault = useModelBasedCalibrationByDefault {
            configBuilder = configBuilder.setUseModelBasedCalibrationByDefault(useModelBasedCalibrationByDefault)
        }

        if let validationCapturesForModelBasedCalibration = validationCapturesForModelBasedCalibration {
            configBuilder = configBuilder.setValidationCapturesForModelBasedCalibration(validationCapturesForModelBasedCalibration)
        }

        if let allowSetMissingFingersDuringCapture = allowSetMissingFingersDuringCapture {
            configBuilder = configBuilder.setAllowSetMissingFingersDuringCapture(allowSetMissingFingersDuringCapture)
        }

        return configBuilder.build()

    }
    
    private func mapToSdk(fpInclusiveQualityMapForScoreTypes: [String : [Int:QualityLevel]]) -> [String : [Int:SlapshotCaptureSDK.QualityLevel]] {
        var converted = [String : [Int:SlapshotCaptureSDK.QualityLevel]]()
        for nextMap in fpInclusiveQualityMapForScoreTypes {
            var convertedMap = [Int:SlapshotCaptureSDK.QualityLevel]()
            for nextKeyAndValue in nextMap.value {
                let key = nextKeyAndValue.key
                let value = nextKeyAndValue.value.mapToSdk()
                convertedMap[key] = value
            }
            converted[nextMap.key] = convertedMap
        }
        
        return converted
    }
}

extension SlapshotFaceConfiguration {
    func mapToSdk() -> CaptureEngineFaceConfig {
        var config = SlapshotSDK.getEngine().createNewCaptureEngineFaceConfigBuilder()

        if let autoCaptureFaceAfterValidation = autoCaptureFaceAfterValidation {
            config = config.setAutoCaptureFaceAfterValidation(autoCaptureFaceAfterValidation)
        }

        if let minFaceWidthInPixels = minFaceWidthInPixels {
            config = config.setMinFaceWidthInPixels(minFaceWidthInPixels)
        }

        if let minFaceWidthToMinorImageAxisRatio = minFaceWidthToMinorImageAxisRatio {
            config = config.setMinFaceWidthToMinorImageAxisRatio(minFaceWidthToMinorImageAxisRatio)
        }

        if let maxFaceWidthInPixels = maxFaceWidthInPixels {
            config = config.setMaxFaceWithInPixels(maxFaceWidthInPixels)
        }

        if let maxFaceWidthToMinorImageAxisRatio = maxFaceWidthToMinorImageAxisRatio {
            config = config.setMaxFaceWidthToMinorImageAxisRatio(maxFaceWidthToMinorImageAxisRatio)
        }

        if let requiredMillisecondsOfValidFacesBeforeCapture = requiredMillisecondsOfValidFacesBeforeCapture {
            config = config.setRequiredMillisecondsOfValidFacesBeforeCapture(requiredMillisecondsOfValidFacesBeforeCapture)
        }

        if let faceExportPaddingFactor = faceExportPaddingFactor {
            config = config.setFaceExportPaddingFactor(faceExportPaddingFactor)
        }

        if let faceExportHeightToWidthFactor = faceExportHeightToWidthFactor {
            config = config.setFaceExportHeightToWidthFactor(faceExportHeightToWidthFactor)
        }

        if let showDebugFaceCaptureOverlays = showDebugFaceCaptureOverlays {
            config = config.setShowDebugFaceCaptureOverlays(showDebugFaceCaptureOverlays)
        }

        return SlapshotSDK.getEngine().createNewCaptureEngineFaceConfigBuilder()
            .build()
    }
}
