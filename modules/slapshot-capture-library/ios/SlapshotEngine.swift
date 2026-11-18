protocol SlapshotEngine {
    
    func prepare() -> Void
    
    func getVersion() -> String

    func getIsCalibrated() -> Bool
    
    func resetCalibration(promiseWrapper: SlapshotEnginePromiseWrapper) -> Void
    
    func exportCalibration(promiseWrapper: SlapshotEnginePromiseWrapper) -> Void
    
    func addModelBasedCalibration(modelBasedCalibrationContent:String, promiseWrapper: SlapshotEnginePromiseWrapper) -> Void
    
    func configure(configuration: SlapshotConfiguration) -> Void
    
    func calibrate(callbacks: SlapshotEngineCallbackWrapper) -> Void
    
    func captureBiometrics(parameters: CaptureBiometricsParameters, callbacks: SlapshotEngineCallbackWrapper) -> Void
    
    func runReviewCapturedModality(parameters: ReviewBiometricsParameters, callbacks: SlapshotEngineCallbackWrapper) -> Void
    
    func exportCapturedIdentity(parameters: ExportCaptureRequest, callbacks: SlapshotEngineCallbackWrapper) -> Void
    
    func validateCalibration(viewId: Int, callbacks: SlapshotEngineCallbackWrapper) -> Void
    
    func getCaptureIdentity(id: String, promiseWrapper: SlapshotEnginePromiseWrapper) -> Void
    
    func getAllCaptureIdentities(promiseWrapper: SlapshotEnginePromiseWrapper) -> Void
    
    func deleteCaptureIdentity(parameters: CaptureIdentity, promiseWrapper: SlapshotEnginePromiseWrapper) -> Void

    func deleteAllCaptureIdentities(promiseWrapper: SlapshotEnginePromiseWrapper) -> Void
    
    func resetDirectionPrompts(promiseWrapper: SlapshotEnginePromiseWrapper) -> Void

    
}
