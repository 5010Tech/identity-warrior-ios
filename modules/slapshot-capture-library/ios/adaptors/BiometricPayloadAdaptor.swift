import Foundation
import SlapshotCaptureSDK

extension BiometricPayload {
    static func mapFromSdk(
        sdkBiometricPayload: SlapshotCaptureSDK.BiometricPayload,
        exportRequest: ExportCaptureRequest) throws -> BiometricPayload
    {
        
        let fingerEncodingType = exportRequest.encodingType
            
        if fingerEncodingType != EncodingType.raw && fingerEncodingType != EncodingType.png && fingerEncodingType != EncodingType.wsq {
            throw SlapshotEngineError.unknown(message: "Export only support png, jpg and wsq at the current time.")
        }
        
        var faceEncodingType = exportRequest.faceExportOptions?.encodingType ?? .jpg

        let sdkFingerEncodingType = try fingerEncodingType.mapToSdk()
        let sdkFaceEncodingType = try faceEncodingType.mapToSdk()
        let captureIdentity = CaptureIdentity.mapFromSdk(sdkIdentity: sdkBiometricPayload.captureIdentity)
        
        var fingerprints: [Fingerprint] = []
        var faces: [Face] = []
        
        sdkBiometricPayload.fingerprints.forEach { (sdkFingerprint) in
            
            let qualityScore: FpQualityScore?
            if let qualityScoreEntity = sdkFingerprint.qualityScore {
                qualityScore = FpQualityScore(
                    type: qualityScoreEntity.type,
                    quality: qualityScoreEntity.quality,
                    scoreMin: qualityScoreEntity.scoreMin,
                    scoreMax: qualityScoreEntity.scoreMax,
                    isHigherScoreBetter: qualityScoreEntity.isHigherScoreBetter)
            }
            else {
                qualityScore = nil
            }
            
            let type = FingerType.mapFromSdk(sdkFingerType: sdkFingerprint.fingerType)
            
            let condition = FpCondition.mapFromSdk(sdkFpCondition: sdkFingerprint.condition)
            
            let metadata = BiometricMetadata(notes: sdkFingerprint.meta.notes)
            
            var locations: [FingerprintLocation] = []
            sdkFingerprint.containedFingerLocations.forEach { (sdkLocation) in
                var qualityScore:FpQualityScore? = nil
                if let qualityScoreEntity = sdkLocation.qualityScore {
                    qualityScore = FpQualityScore(
                        type: qualityScoreEntity.type,
                        quality: qualityScoreEntity.quality,
                        scoreMin: qualityScoreEntity.scoreMin,
                        scoreMax: qualityScoreEntity.scoreMax,
                        isHigherScoreBetter: qualityScoreEntity.isHigherScoreBetter)
                }
                let location = FingerprintLocation(
                    fingerType: FingerType.mapFromSdk(sdkFingerType: sdkLocation.fingerType),
                    l: sdkLocation.l,
                    r: sdkLocation.r,
                    t: sdkLocation.t,
                    b: sdkLocation.b,
                    w: sdkLocation.w,
                    h: sdkLocation.h,
                    qualityScore: qualityScore
                    )
                
                locations.append(location)
            }
                        
            let encodedImage = sdkFingerprint.createImage(encodingType: sdkFingerEncodingType)
            
            let fingerprint = Fingerprint(
                fingerType: type,
                dpi: sdkFingerprint.dpi,
                qualityScore: qualityScore,
                containedFingerLocations: locations,
                meta: metadata,
                condition: condition,
                image: encodedImage == nil ? nil : EncodedImage.mapFromSdk(sdkEncodedImage: encodedImage!)
            )

            fingerprints.append(fingerprint)
        }
        
        let faceExportMaxDimension = exportRequest.faceExportOptions?.maxDimension ?? 0
        let exportCroppedFace = exportRequest.faceExportOptions?.exportCroppedFace ?? true
        sdkBiometricPayload.faces.forEach { (sdkFace) in
            var encodedImage = sdkFace.createImage(maxDimension: faceExportMaxDimension, exportCroppedFace: exportCroppedFace, encodingType: sdkFaceEncodingType)
            if encodedImage == nil && exportCroppedFace {
                // no face detected, so export the entire image
                encodedImage = sdkFace.createImage(maxDimension: faceExportMaxDimension, exportCroppedFace: exportCroppedFace, encodingType: sdkFaceEncodingType)
            }
            
            guard let encodedImage = encodedImage else {
                return
            }
            
            let face = Face(image: EncodedImage.mapFromSdk(sdkEncodedImage: encodedImage))
            
            faces.append(face)
        }
        
        // Latent prints (DigitalLift capture requests)
        let liftOptions = exportRequest.digitalLiftExportOptions ?? DigitalLiftExportOptions()
        let sdkLiftEncodingType = try liftOptions.encodingType.mapToSdk()
        let sdkLiftSourceEncodingType = try liftOptions.sourceEncodingType.mapToSdk()
        var digitalLifts: [DigitalLiftDto] = []
        sdkBiometricPayload.digitalLifts.forEach { (sdkLift) in
            var image: EncodedImage? = nil
            if let sdkImage = sdkLift.createImage(encodingType: sdkLiftEncodingType), sdkImage.data != nil {
                image = EncodedImage.mapFromSdk(sdkEncodedImage: sdkImage)
            }
            var srcImage: EncodedImage? = nil
            if liftOptions.exportSource,
               let sdkSrcImage = sdkLift.createSrcImage(encodingType: sdkLiftSourceEncodingType),
               sdkSrcImage.data != nil {
                srcImage = EncodedImage.mapFromSdk(sdkEncodedImage: sdkSrcImage)
            }
            digitalLifts.append(DigitalLiftDto(dpi: sdkLift.dpi, image: image, srcImage: srcImage))
        }

        // Contactless palms (PalmCapture capture requests)
        var palms: [PalmDto] = []
        sdkBiometricPayload.palms.forEach { (sdkPalm) in
            var image: EncodedImage? = nil
            // The processed print (the SDK's AFIS image), as fingerprints are
            // exported, not the photograph of the palm. Falls back to the
            // plain image if the SDK has no processed one.
            if let sdkImage = sdkPalm.createAfisImage(encodingType: sdkFingerEncodingType), sdkImage.data != nil {
                image = EncodedImage.mapFromSdk(sdkEncodedImage: sdkImage)
            } else if let sdkImage = sdkPalm.createImage(encodingType: sdkFingerEncodingType), sdkImage.data != nil {
                image = EncodedImage.mapFromSdk(sdkEncodedImage: sdkImage)
            }
            palms.append(PalmDto(dpi: sdkPalm.dpi, palmType: sdkPalm.meta.palmType.rawValue, image: image))
        }

        let biometricPayload = BiometricPayload(
            captureIdentity: captureIdentity,
            fingerprints: fingerprints,
            faces: faces,
            digitalLifts: digitalLifts,
            palms: palms)
        
        return biometricPayload
    }
}
