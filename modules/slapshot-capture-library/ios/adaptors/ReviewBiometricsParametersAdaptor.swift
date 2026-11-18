
import Foundation
import SlapshotCaptureSDK

extension ReviewBiometricsParameters {
    func mapToSdk() throws -> SlapshotCaptureSDK.ReviewRequest {
        let slapshotCaptureEngine = SlapshotSDK.getEngine()
        
        guard let identityId = self.reviewRequest?.identityId,
              let capturedModalityId = self.reviewRequest?.capturedModalityId else {
            throw SlapshotEngineError.unknown(message: "identityId or capturedModalityId not set")
        }
        
        var reviewRequestBuilder = slapshotCaptureEngine.createNewReviewRequestBuilder(
            identityId: identityId,
            capturedModalityId: capturedModalityId)
        
        if let isMutable = self.reviewRequest?.isMutable {
            reviewRequestBuilder = reviewRequestBuilder.setIsMutable(isMutable)
        }
        
        if let showImagesInReview = self.reviewRequest?.showImagesInReview {
            reviewRequestBuilder = reviewRequestBuilder.setShowImagesInReview(showImagesInReview)
        }
    
        return reviewRequestBuilder.build()
    }
}
