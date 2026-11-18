import Foundation
import SlapshotCaptureSDK

extension CaptureBiometricsParameters {
    func mapToSdk() -> SlapshotCaptureSDK.CaptureRequestSequence {
        let slapshotCaptureEngine = SlapshotSDK.getEngine()
        var sequenceBuilder = slapshotCaptureEngine.createNewCaptureRequestSequenceBuilder()
        
        self.captureRequestSequence?.captureRequests?.forEach { captureRequest in
            guard let captureRequestType = captureRequest.captureRequestType else {
                return
            }
            
            let mappedCaptureRequestType = captureRequestType.mapToSdk()

            var captureRequestBuilder = slapshotCaptureEngine.createNewCaptureRequestBuilder()
                .setCaptureRequestType(captureRequestType: mappedCaptureRequestType);
            
            if let reviewCapture = captureRequest.reviewCapture {
                captureRequestBuilder = captureRequestBuilder.setReviewCapture(reviewCapture)
            }
            
            if let showCaptureImageInReview = captureRequest.showCaptureImageInReview {
                captureRequestBuilder = captureRequestBuilder.setShowCaptureImageInReview(showCaptureImageInReview)
            }
            
            if let singleFingerCaptureExplicitType = captureRequest.singleFingerCaptureExplicitType {
                captureRequestBuilder = captureRequestBuilder.setSingleFingerCaptureExplicitType(singleFingerCaptureExplicitType.mapToSdk())
            }
            
            if let missingFingerMapping = captureRequest.missingFingerMapping {
                captureRequestBuilder = captureRequestBuilder.setMissingFingerMapping(mapToSDK(missingFingerMapping: missingFingerMapping))
            }
            
            if let allowUserToChangeTorchSetting = captureRequest.allowUserToChangeTorchSetting {
                captureRequestBuilder = captureRequestBuilder.setAllowUserToChangeToTorchSetting(allowUserToChangeTorchSetting)
            }
            
            if let defaultTorchSetting = captureRequest.defaultTorchSetting {
                captureRequestBuilder = captureRequestBuilder.setDefaultTorchSetting(defaultTorchSetting.mapToSdk())
            }
            
            sequenceBuilder = sequenceBuilder.addCaptureRequest(captureRequest: captureRequestBuilder.build())
        }
        
        if self.captureRequestSequence?.userMode != nil {
            _ = sequenceBuilder.setUserMode(userMode: self.captureRequestSequence!.userMode.mapToSdk())
        }
        
        if self.captureRequestSequence?.existingCaptureIdentity != nil {
            let identity = self.captureRequestSequence!.existingCaptureIdentity!.mapToSdk()
            _ = sequenceBuilder.setExistingCaptureIdentity(captureIdentity: identity)
        }
    
        return sequenceBuilder.build()
    }
    
    private func mapToSDK(missingFingerMapping: [FingerType:FpCondition]) -> [SlapshotCaptureSDK.FingerType:SlapshotCaptureSDK.FpCondition] {
        var map = [SlapshotCaptureSDK.FingerType:SlapshotCaptureSDK.FpCondition]()
        for keyAndValue in missingFingerMapping {
            map[keyAndValue.key.mapToSdk()] = keyAndValue.value.mapToSdk()
        }
        
        return map
    }
}
