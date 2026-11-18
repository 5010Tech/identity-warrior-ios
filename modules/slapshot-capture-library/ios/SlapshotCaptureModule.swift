import Foundation
import SlapshotCaptureSDK

//
// NOTE: several of the implementation hooks are satisifed with dummy calls.    This is due to the fact
//       that a licensing solution for iOS is not currently in-place for Slapshot

@objc(SlapshotCaptureModule)
class SlapshotCaptureModule: RCTEventEmitter, SlapshotCaptureEventEmitter {

    private var configured = false
    private var initialized = false

    var promiseWrapper = SlapshotEnginePromiseWrapper()
    var callbackWrapper = SlapshotEngineCallbackWrapper()

    private let EXPORT_PROGRESS_EVENT_NAME = "eventExportProgress"

    @objc
    func canRestore(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
        resolve(false)
    }

    override init() {
        super.init()
    }

    @objc
    func configure(_ dictionary: NSDictionary) {
        // Convert NSDictionary to [String: Any]
        let dict = dictionary as? [String: Any] ?? [:]

        // convert into JSON
        guard let jsonData = dict.jsonData else {
            SlapshotLogger.write("Something is wrong while converting dictionary to JSON data.")
            return
        }

        let configuration = try? JSONDecoder().decode(SlapshotConfiguration.self, from: jsonData)
        if let actualConfiguration = configuration {
            let engine = ensureViewModel()
            engine.configure(configuration: actualConfiguration)

            SlapshotLogger.write("Configuration applied")

            self.configured = true
        } else {
            SlapshotLogger.write("Could not parse incoming dictionary to expected format")
        }
    }

    @objc(init:rejecter:)
    func initialize(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        if !self.configured {
            callbackWrapper.reject(
                error: "The SDK must be configured prior to calling initialized.")
            return
        }

        // need to call this to initialize parts of the Slapshot SDK
        let engine = ensureViewModel()
        engine.prepare()

        // NOTE: noop due to licensing

        initialized = true
        promiseWrapper.resolve(result: true)
    }

    @objc
    func getVersion(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        let engine = SlapshotCaptureViewConfiguration.shared.viewModel
        let version = engine?.getVersion() ?? "Unknown"
        promiseWrapper.resolve(result: version)
    }

    @objc
    func backPressed(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        // NOTE: this is a noop for iOS
        let backStateName = "Unknown"
        promiseWrapper.resolve(result: "Back pressed " + backStateName)
    }

    @objc
    func isLicensed(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        // NOTE: noop due to licensing
        promiseWrapper.resolve(result: true)
    }

    @objc(setLicenseEntitlement:setLicenseWithResolver:rejecter:)
    func setLicenseEntitlement(
        _ entitlementId: String,
        setLicenseWithResolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)
        promiseWrapper.resolve(result: true)
    }

    @objc
    func getLicensingHardwareId(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        // NOTE: noop due to licensing
        let id = "demonstration"
        promiseWrapper.resolve(result: id)
    }

    @objc(installLicense:resolve:rejecter:)
    func installLicense(
        _ licenseContent: String,
        resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)
        promiseWrapper.resolve(result: true)
    }

    @objc
    func calibrate(
        _ viewId: NSNumber, onError: @escaping RCTResponseSenderBlock,
        onSuccess: @escaping RCTResponseSenderBlock
    ) {
        callbackWrapper.set(callbackResolve: onSuccess, callbackReject: onError)

        if !self.initialized {
            callbackWrapper.reject(
                error: "The SDK must be configured and initialized prior to calling calibrate.")
            return
        }

        let engine = SlapshotCaptureViewConfiguration.shared.viewModel
        engine?.calibrate(callbacks: callbackWrapper)
    }

    @objc
    func isCalibrated() -> Any {
        let engine = SlapshotCaptureViewConfiguration.shared.viewModel

        let result: Bool = engine?.getIsCalibrated() ?? false
        return result
    }

    @objc
    func resetCalibration(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let engine = SlapshotCaptureViewConfiguration.shared.viewModel
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        engine?.resetCalibration(promiseWrapper: promiseWrapper)
    }

    @objc
    func exportCalibration(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let engine = SlapshotCaptureViewConfiguration.shared.viewModel
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        engine?.exportCalibration(promiseWrapper: promiseWrapper)
    }

    @objc
    func addModelBasedCalibration(
        _ modelBasedCalibrationContent: NSString, resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        if !self.initialized {
            promiseWrapper.reject(
                error:
                    "The SDK must be configured and initialized prior to calling addModelBasedCalibration."
            )
            return
        }

        let modelBasedCalibrationContentString = modelBasedCalibrationContent as String

        let engine = SlapshotCaptureViewConfiguration.shared.viewModel
        engine?.addModelBasedCalibration(
            modelBasedCalibrationContent: modelBasedCalibrationContentString,
            promiseWrapper: promiseWrapper)
    }

    @objc
    func validateCalibration(
        _ viewId: NSNumber, onError: @escaping RCTResponseSenderBlock,
        onSuccess: @escaping RCTResponseSenderBlock
    ) {
        callbackWrapper.set(callbackResolve: onSuccess, callbackReject: onError)

        if !self.initialized {
            callbackWrapper.reject(
                error:
                    "The SDK must be configured and initialized prior to calling validateCalibration."
            )
            return
        }

        let engine = SlapshotCaptureViewConfiguration.shared.viewModel
        engine?.validateCalibration(viewId: Int(truncating: viewId), callbacks: callbackWrapper)
    }

    // Function to be called from JavaScript side
    @objc
    func captureBiometrics(
        _ input: NSDictionary, onError: @escaping RCTResponseSenderBlock,
        onSuccess: @escaping RCTResponseSenderBlock
    ) {
        callbackWrapper.set(callbackResolve: onSuccess, callbackReject: onError)

        if !self.initialized {
            callbackWrapper.reject(
                error:
                    "The SDK must be configured and initialized prior to calling captureBiometrics."
            )
            return
        }

        // Convert NSDictionary to [String: Any]
        let dict = input as? [String: Any] ?? [:]

        // convert into JSON
        guard let jsonData = dict.jsonData else {
            SlapshotLogger.write("Something is wrong while converting dictionary to JSON data.")
            return
        }

        let configuration = try? JSONDecoder().decode(
            CaptureBiometricsParameters.self, from: jsonData)
        if let actualConfiguration = configuration {
            let engine = SlapshotCaptureViewConfiguration.shared.viewModel

            engine?.captureBiometrics(parameters: actualConfiguration, callbacks: callbackWrapper)

            SlapshotLogger.write("captureBiometrics invoked")
        } else {
            SlapshotLogger.write("Could not parse incoming dictionary to expected format")
        }
    }

    @objc
    func runReviewCapturedModality(
        _ input: NSDictionary, onError: @escaping RCTResponseSenderBlock,
        onSuccess: @escaping RCTResponseSenderBlock
    ) {

        callbackWrapper.set(callbackResolve: onSuccess, callbackReject: onError)

        if !self.initialized {
            callbackWrapper.reject(
                error:
                    "The SDK must be configured and initialized prior to calling runReviewCapturedModality."
            )
            return
        }

        // Convert NSDictionary to [String: Any]
        let dict = input as? [String: Any] ?? [:]

        // convert into JSON
        guard let jsonData = dict.jsonData else {
            SlapshotLogger.write("Something is wrong while converting dictionary to JSON data.")
            return
        }

        let configuration = try? JSONDecoder().decode(
            ReviewBiometricsParameters.self, from: jsonData)
        if let actualConfiguration = configuration {
            SlapshotSdk.eventEmitter = self

            let engine = SlapshotCaptureViewConfiguration.shared.viewModel
            engine?.runReviewCapturedModality(
                parameters: actualConfiguration, callbacks: callbackWrapper)

            SlapshotLogger.write("runReviewCapturedModality invoked")
        } else {
            SlapshotLogger.write("Could not parse incoming dictionary to expected format")
        }
    }

    @objc
    func exportCapturedIdentity(
        _ input: NSDictionary, onError: @escaping RCTResponseSenderBlock,
        onSuccess: @escaping RCTResponseSenderBlock
    ) {

        callbackWrapper.set(callbackResolve: onSuccess, callbackReject: onError)

        if !self.initialized {
            callbackWrapper.reject(
                error:
                    "The SDK must be configured and initialized prior to calling exportCapturedIdentity."
            )
            return
        }

        // Convert NSDictionary to [String: Any]
        var dict = input as? [String: Any] ?? [:]
        dict.removeValue(forKey: "progressCallback")

        guard let jsonData = dict.jsonData else {
            SlapshotLogger.write("Something is wrong while converting dictionary to JSON data.")
            return
        }

        let configuration = try? JSONDecoder().decode(ExportCaptureRequest.self, from: jsonData)
        if let actualConfiguration = configuration {
            SlapshotSdk.eventEmitter = self

            let engine = SlapshotCaptureViewConfiguration.shared.viewModel
            engine?.exportCapturedIdentity(
                parameters: actualConfiguration, callbacks: callbackWrapper)

            SlapshotLogger.write("exportCapturedIdentity invoked")
        } else {
            SlapshotLogger.write("Could not parse incoming dictionary to expected format")
        }
    }

    func sendProgress(value: Int) {
        sendEvent(withName: EXPORT_PROGRESS_EVENT_NAME, body: ["progress": value])
    }

    @objc
    func getAllCaptureIdentities(
        _ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        if !self.initialized {
            promiseWrapper.reject(
                error:
                    "The SDK must be configured and initialized prior to calling getAllCaptureIdentities."
            )
            return
        }

        let engine = SlapshotCaptureViewConfiguration.shared.viewModel
        engine?.getAllCaptureIdentities(promiseWrapper: promiseWrapper)
    }

    @objc
    func getCaptureIdentity(
        _ identifier: NSString, resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        if !self.initialized {
            promiseWrapper.reject(
                error:
                    "The SDK must be configured and initialized prior to calling getCaptureIdentity."
            )
            return
        }

        let identifier = identifier as String

        let engine = SlapshotCaptureViewConfiguration.shared.viewModel
        engine?.getCaptureIdentity(id: identifier, promiseWrapper: promiseWrapper)
    }

    @objc
    func deleteCaptureIdentity(
        _ dictionary: NSDictionary, resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        if !self.initialized {
            promiseWrapper.reject(
                error:
                    "The SDK must be configured and initialized prior to calling deleteCaptureIdentity."
            )
            return
        }

        // Convert NSDictionary to [String: Any]
        let dict = dictionary as? [String: Any] ?? [:]

        // convert into JSON
        guard let jsonData = dict.jsonData else {
            SlapshotLogger.write("Something is wrong while converting dictionary to JSON data.")
            return
        }

        let configuration = try? JSONDecoder().decode(CaptureIdentity.self, from: jsonData)
        if let actualConfiguration = configuration {
            SlapshotSdk.eventEmitter = self

            let engine = SlapshotCaptureViewConfiguration.shared.viewModel
            engine?.deleteCaptureIdentity(
                parameters: actualConfiguration, promiseWrapper: promiseWrapper)

            SlapshotLogger.write("exportCapturedIdentity invoked")
        } else {
            SlapshotLogger.write("Could not parse incoming dictionary to expected format")
        }
    }

    @objc
    func deleteAllCaptureIdentities(
        _ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        if !self.initialized {
            promiseWrapper.reject(
                error:
                    "The SDK must be configured and initialized prior to calling deleteAllCaptureIdentities."
            )
            return
        }

        let engine = SlapshotCaptureViewConfiguration.shared.viewModel
        engine?.deleteAllCaptureIdentities(promiseWrapper: promiseWrapper)
    }

    @objc
    func resetDirectionPrompts(
        _ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        if !self.initialized {
            promiseWrapper.reject(
                error:
                    "The SDK must be configured and initialized prior to calling resetDirectionPrompts."
            )
            return
        }

        let engine = SlapshotCaptureViewConfiguration.shared.viewModel
        engine?.resetDirectionPrompts(promiseWrapper: promiseWrapper)
    }

    @objc
    func resetCalibration(
        _ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock
    ) {
        promiseWrapper.set(promiseResolve: resolve, promiseReject: reject)

        if !self.initialized {
            promiseWrapper.reject(
                error:
                    "The SDK must be configured and initialized prior to calling resetCalibration.")
            return
        }

        let engine = SlapshotCaptureViewConfiguration.shared.viewModel
        engine?.resetCalibration(promiseWrapper: promiseWrapper)
    }

    override func supportedEvents() -> [String] {
        return [
            EXPORT_PROGRESS_EVENT_NAME
        ]
    }

    override func constantsToExport() -> [AnyHashable: Any]! {
        return [
            "EXPORT_PROGRESS_EVENT_NAME": EXPORT_PROGRESS_EVENT_NAME
        ]
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    private func ensureViewModel() -> SlapshotViewModel {
        // need to call this to initialize parts of the Slapshot SDK
        if SlapshotCaptureViewConfiguration.shared.viewModel == nil {
            SlapshotCaptureViewConfiguration.shared.viewModel = SlapshotViewModel()
        }

        return SlapshotCaptureViewConfiguration.shared.viewModel as! SlapshotViewModel
    }
}
