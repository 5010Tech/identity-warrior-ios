import Combine
import Foundation
import SlapshotCaptureSDK

class SlapshotViewModel: SlapshotEngine {
    init() {
        // DebugHelper.shared.releaseAndBuildVersionString
    }
    
    func configure(configuration: SlapshotConfiguration) {
        // translate passed parameters into SDK configuration
        let config = configuration.mapToSdk()
        SlapshotSDK.getEngine().configure(config: config)
    }
    
    func prepare() {
        do {
            try SlapshotSDK.getEngine().initialize()
        }
        catch {
            SlapshotLogger.error(error.localizedDescription)
        }
    }

    func getVersion() -> String {
        SlapshotLogger.write("retrieving version from the SlapshotSDK engine.")
        return SlapshotSDK.getEngine().version
    }
        
    func getIsCalibrated() -> Bool {
        SlapshotLogger.write("retrieving calibration status from the SlapshotSDK engine.")
        return SlapshotSDK.getEngine().isCalibrated
    }
    
    func calibrate(callbacks: SlapshotEngineCallbackWrapper) {
        do {
            try SlapshotSDK.getEngine().runCalibration {
                SlapshotLogger.write("SlapshotSDK engine reported that calibration was executed successfully.")
                
                callbacks.resolve()
            } onError: { error in
                if case .cancelled = error {
                    callbacks.reject(error: SlapshotCaptureError.Cancelled())
                } else {
                    callbacks.reject(error: SlapshotCaptureError.FromError(error: error.localizedDescription))
                }
                
                SlapshotLogger.error(error.localizedDescription)
            }
        }
        catch {
            let errorMessage = "Error running calibration \(error)"
            
            SlapshotLogger.error(errorMessage)
            callbacks.reject(error: errorMessage)
        }
    }
    
    func validateCalibration(viewId: Int, callbacks: SlapshotEngineCallbackWrapper) {
        do {
            try SlapshotSDK.getEngine().runCalibrationValidation(numberOfValidationCaptures: 3) {
                SlapshotLogger.write("SlapshotSDK engine reported that calibration validation was executed successfully.")
                
                callbacks.resolve()
            } onError: { error in
                if case .cancelled = error {
                    callbacks.reject(error: SlapshotCaptureError.Cancelled())
                } else {
                    callbacks.reject(error: SlapshotCaptureError.FromError(error: error.localizedDescription))
                }
                
                SlapshotLogger.error(error.localizedDescription)
            }
        }
        catch {
            let errorMessage = "Error running calibration \(error)"
            
            SlapshotLogger.error(errorMessage)
            callbacks.reject(error: errorMessage)
        }
    }
    
    func captureBiometrics(parameters: CaptureBiometricsParameters, callbacks: SlapshotEngineCallbackWrapper){
        // translate passed parameters into SDK configuration
        let captureSequence = parameters.mapToSdk()
        
        do {
            try SlapshotSDK.getEngine().runCaptureSequence(captureRequestSequence: captureSequence) { (identity) in
                SlapshotLogger.write("SlapshotSDK engine reported that the capture sequence was executed successfully.")

                let marshalledIdentity = CaptureIdentity.mapFromSdk(sdkIdentity: identity)
                
                // let callbackPayload = DataSerializer.Serialize(item: marshalledIdentity)
                callbacks.resolve(result: marshalledIdentity)
                
            } onError: { slapshotError in
                switch slapshotError {
                case .cancelled:
                    callbacks.reject(error: SlapshotCaptureError.Cancelled())
                case let .error(message):
                    callbacks.reject(error: SlapshotCaptureError.FromError(error: message))
                default:
                    callbacks.reject(error: SlapshotCaptureError.FromError(error: "Unexpected slapshot error \(slapshotError)"))
                }
            }
        }
        catch {
            let errorMessage = "Error running capture sequence \(error)"
            
            SlapshotLogger.error(errorMessage)
            callbacks.reject(error: SlapshotCaptureError.FromError(error: errorMessage))
        }
    }
    
    func runReviewCapturedModality(parameters: ReviewBiometricsParameters, callbacks: SlapshotEngineCallbackWrapper) {
        
        do {
            // translate passed parameters into SDK configuration
            let reviewRequest = try parameters.mapToSdk()
            
            try SlapshotSDK.getEngine().runReviewCapturedModality(
                reviewRequest: reviewRequest,
                onSuccess: { identity in
                    SlapshotLogger.write("SlapshotSDK engine reported that the capture review was executed successfully.")

                    let marshalledIdentity = CaptureIdentity.mapFromSdk(sdkIdentity: identity)
                    
                    callbacks.resolve(result: marshalledIdentity)
                },
                onError: { slapshotError in
                    switch slapshotError {
                    case .cancelled:
                        callbacks.reject(error: SlapshotCaptureError.Cancelled())
                    case let .error(message):
                        callbacks.reject(error: SlapshotCaptureError.FromError(error: message))
                    default:
                        callbacks.reject(error: SlapshotCaptureError.FromError(error: "Unexpected slapshot error \(slapshotError)"))
                    }
                })
        }
        catch {
            let errorMessage = "Error running review request \(error)"
            
            SlapshotLogger.error(errorMessage)
            callbacks.reject(error: SlapshotCaptureError.FromError(error: errorMessage))
        }
    }
    
    func exportCapturedIdentity(parameters: ExportCaptureRequest, callbacks: SlapshotEngineCallbackWrapper) {
        do {
            // translate passed parameters into SDK configuration
            let exportCaptureRequest = parameters.mapToSdk(progresssCallback: self.progressCallback)
            
            let sdkBiometricPayload = try SlapshotSDK.getEngine().exportCaptureIdentity(exportCaptureRequest: exportCaptureRequest, cancelToken: CancelToken())
            
            SlapshotLogger.write("SlapshotSDK engine reported that the export was executed successfully.")
            
            let biometricPayload = try BiometricPayload.mapFromSdk(
                sdkBiometricPayload: sdkBiometricPayload,
                exportRequest: parameters)
            
            // let payload = DataSerializer.Serialize(item: biometricPayload)
            callbacks.resolve(result: biometricPayload)
        }
        catch {
            let errorMessage = "Error running capture sequence \(error)"
            
            SlapshotLogger.error(errorMessage)
            callbacks.reject(error: SlapshotCaptureError.FromError(error: errorMessage))
        }
    }
    
    private func progressCallback(value: Int) ->  Void {
        SlapshotSdk.eventEmitter?.sendProgress(value: value)
    }

    func getCaptureIdentity(id: String, promiseWrapper: SlapshotEnginePromiseWrapper) {
        do {
            let sdkCaptureIdentity = try SlapshotSDK.getEngine().getCaptureIdentity(id: id)
            
            SlapshotLogger.write("SlapshotSDK engine reported that the capture identity was retrieved.")
            
            let captureIdentity = CaptureIdentity.mapFromSdk(sdkIdentity: sdkCaptureIdentity)
            promiseWrapper.resolve(result: captureIdentity)
        }
        catch {
            let errorMessage = "Error retrieveing capture identity \(error)"
            
            SlapshotLogger.error(errorMessage)
            promiseWrapper.reject(error: SlapshotCaptureError.FromError(error: errorMessage))
        }
    }
    
    func getAllCaptureIdentities(promiseWrapper: SlapshotEnginePromiseWrapper) {
        do {
            let sdkCaptureIdentities = try SlapshotSDK.getEngine().getAllCaptureIdentities()
            
            var captureIdentities: [CaptureIdentity] = []
            sdkCaptureIdentities.forEach { (sdkCaptureIdentity) in
                let captureIdentity = CaptureIdentity.mapFromSdk(sdkIdentity: sdkCaptureIdentity)
                captureIdentities.append(captureIdentity)
            }

            SlapshotLogger.write("SlapshotSDK engine reported that the capture identities were retrieved.")

            promiseWrapper.resolve(result: captureIdentities)
        }
        catch {
            let errorMessage = "Error retrieveing capture identity \(error)"
            
            SlapshotLogger.error(errorMessage)
            promiseWrapper.reject(error: SlapshotCaptureError.FromError(error: errorMessage))
        }
    }
    
    func deleteCaptureIdentity(parameters: CaptureIdentity, promiseWrapper: SlapshotEnginePromiseWrapper) {
        do {
            let sdkCaptureIdentity = parameters.mapToSdk()
            try SlapshotSDK.getEngine().deleteCaptureIdentity(captureIdentity: sdkCaptureIdentity)
            
            SlapshotLogger.write("SlapshotSDK engine reported that all capture identities have been deleted.")
            promiseWrapper.resolve(result: [])
        }
        catch {
            let errorMessage = "Error deleting capture identities \(error)"
            
            SlapshotLogger.error(errorMessage)
            promiseWrapper.reject(error: SlapshotCaptureError.FromError(error: errorMessage))
        }
    }
    
    func deleteAllCaptureIdentities(promiseWrapper: SlapshotEnginePromiseWrapper) {
        do {
            try SlapshotSDK.getEngine().deleteAllCaptureIdentities()
            
            SlapshotLogger.write("SlapshotSDK engine reported that all capture identities have been deleted.")
            promiseWrapper.resolve(result: [])
        }
        catch {
            let errorMessage = "Error deleting capture identities \(error)"
            
            SlapshotLogger.error(errorMessage)
            promiseWrapper.reject(error: SlapshotCaptureError.FromError(error: errorMessage))
        }
    }
    
    func resetDirectionPrompts(promiseWrapper: SlapshotEnginePromiseWrapper) {
        do {
            try SlapshotSDK.getEngine().resetDirectionPrompts()
            
            SlapshotLogger.write("SlapshotSDK engine reported that direction prompts have been reset.")
            promiseWrapper.resolve(result: [])
        }
        catch {
            let errorMessage = "Error resetting direction prompts \(error)"
            
            SlapshotLogger.error(errorMessage)
            promiseWrapper.reject(error: SlapshotCaptureError.FromError(error: errorMessage))
        }    }
    
    func resetCalibration(promiseWrapper: SlapshotEnginePromiseWrapper) {
        do {
            try SlapshotSDK.getEngine().resetCalibration()
            
            SlapshotLogger.write("SlapshotSDK engine reported that calibration has been reset.")
            promiseWrapper.resolve(result: [])
        }
        catch {
            let errorMessage = "Error resetting calibration \(error)"
            
            SlapshotLogger.error(errorMessage)
            promiseWrapper.reject(error: SlapshotCaptureError.FromError(error: errorMessage))
        }
    }
    
    func exportCalibration(promiseWrapper: SlapshotEnginePromiseWrapper) -> Void {
        SlapshotSDK.getEngine().exportCalibration()
        
        SlapshotLogger.write("SlapshotSDK engine reported that calibration export routine has been run.")
        promiseWrapper.resolve(result: [])
    }
    
    func addModelBasedCalibration(modelBasedCalibrationContent:String, promiseWrapper: SlapshotEnginePromiseWrapper) -> Void {
        do {
            
            if let byteArray = modelBasedCalibrationContent.data(using: .utf8)?.map({ UInt8($0) }) {
                let result = try SlapshotSDK.getEngine().addModelBasedCalibration(calibrationBytes: byteArray)
                SlapshotLogger.write("SlapshotSDK engine reported that the model based calibration has been added.")
                promiseWrapper.resolve(result: result)
            } else {
                let errorMessage = "Error adding model based calibration. Could not decode base64 input"
                
                SlapshotLogger.error(errorMessage)
                promiseWrapper.reject(error: SlapshotCaptureError.FromError(error: errorMessage))
            }
            
        }
        catch {
            let errorMessage = "Error adding model based calibration \(error)"
            
            SlapshotLogger.error(errorMessage)
            promiseWrapper.reject(error: SlapshotCaptureError.FromError(error: errorMessage))
        }
    }
}
