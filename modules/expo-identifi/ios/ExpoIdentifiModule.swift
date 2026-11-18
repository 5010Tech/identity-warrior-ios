import ExpoModulesCore
import UIKit

public class ExpoIdentifiModule: Module {
  private var identifiInstance: IdentiFI = IdentiFI()
  private var promises: [String: Promise] = [:]
  private let delegateAdapter: IdentiFIDelegateAdapter = IdentiFIDelegateAdapter()

  private let captureGroup: DispatchGroup = DispatchGroup()
  private var imageData_RAW: NSData?
  private var imageData: UIImage?
  private var captureError: String?

  private static weak var fingerView: ExpoIdentifiView?
  private static weak var leftIrisView: ExpoIdentifiView?
  private static weak var rightIrisView: ExpoIdentifiView?

  private var didEmitIrisStarted = false
  private var didEmitIrisPreviewFrame = false

  required public init(appContext: AppContext) {
    super.init(appContext: appContext)
    self.identifiInstance = .init()
    self.identifiInstance.setDelegate(self.delegateAdapter)
    self.delegateAdapter.module = self
  }

  public static func registerView(_ view: ExpoIdentifiView, for streamType: ExpoIdentifiStreamType) {
    switch streamType {
    case .finger:
      fingerView = view
    case .irisLeft:
      leftIrisView = view
    case .irisRight:
      rightIrisView = view
    }
  }

  public static func unregisterView(_ view: ExpoIdentifiView, for streamType: ExpoIdentifiStreamType) {
    switch streamType {
    case .finger where fingerView === view:
      fingerView = nil
    case .irisLeft where leftIrisView === view:
      leftIrisView = nil
    case .irisRight where rightIrisView === view:
      rightIrisView = nil
    default:
      break
    }
  }

  public func definition() -> ModuleDefinition {
    Name("ExpoIdentifi")

    View(ExpoIdentifiView.self) {
      Prop("streamType") { (view: ExpoIdentifiView, streamType: String?) in
        view.streamType = ExpoIdentifiStreamType(rawValue: streamType ?? "finger") ?? .finger
      }
    }

    Events(["onStreaming", "onIrisCaptureStatus", "onIrisPreviewFrame"])

    Function("getLibraryVersion") {
      self.identifiInstance.getLibraryVersion()
    }

    AsyncFunction("connect", asyncOperation(forKey: "connect") {
      self.identifiInstance.connect()
    })

    AsyncFunction("disconnect", asyncOperation(forKey: "disconnect") {
      self.identifiInstance.disconnect()
    })

    AsyncFunction("startCaptureOneFinger", asyncOperation(forKey: "capture") { (savedAtIndex: Int32) in
      self.initializeCaptureGroup()
      self.identifiInstance.startCaptureOneFinger(savedAtIndex)
    })

    AsyncFunction("startCaptureTwoFinger", asyncOperation(forKey: "capture") { (savedAtIndex: Int32) in
      self.initializeCaptureGroup()
      self.identifiInstance.startCaptureTwoFinger(savedAtIndex)
    })

    AsyncFunction("startCaptureFourFinger", asyncOperation(forKey: "capture") { (savedAtIndex: Int32) in
      self.initializeCaptureGroup()
      self.identifiInstance.startCaptureFourFinger(savedAtIndex)
    })

    AsyncFunction("startCaptureRollFinger", asyncOperation(forKey: "capture") { (savedAtIndex: Int32) in
      self.initializeCaptureGroup()
      self.identifiInstance.startCaptureRollFinger(savedAtIndex)
    })

    AsyncFunction("cancelFpCapture", asyncOperation(forKey: "cancelFpCapture") {
      self.identifiInstance.cancelFpCapture()
    })

    AsyncFunction("startCaptureIris", asyncOperation(forKey: "irisCapture") {
      self.resetIrisCaptureState()
      self.identifiInstance.startCaptureIris()
    })

    AsyncFunction("cancelIrisCapture", asyncOperation(forKey: "cancelIrisCapture") {
      self.identifiInstance.cancelIrisCapture()
    })

    AsyncFunction("getBatteryPercentage", asyncOperation(forKey: "battery") {
      self.identifiInstance.getBatteryPercentage()
    })

    AsyncFunction("getDeviceSerialNumber", asyncOperation(forKey: "serial") {
      self.identifiInstance.getDeviceSerialNumber()
    })

    AsyncFunction("getModelNumber", asyncOperation(forKey: "modelNumber") {
      self.identifiInstance.getModelNumber()
    })

    AsyncFunction("clearSavedFpImages", asyncOperation(forKey: "clearSavedFpImages") { (savedAtIndex: Int32) in
      self.identifiInstance.clearSavedFpImages(savedAtIndex)
    })

    AsyncFunction("setMinimumNFIQScore", asyncOperation(forKey: "setMinimumNFIQScore") { (minimumNFIQScore: Int32) in
      self.identifiInstance.setMinimumNFIQScore(minimumNFIQScore)
    })

    AsyncFunction("getNFIQScore", asyncOperation(forKey: "getNfiqScore") { (savedAtIndex: Int32) in
      self.identifiInstance.getNfiqScoreFromImageSaved(at: savedAtIndex)
    })

    AsyncFunction("getWSQEncodedFpImageFromImageSavedAt", asyncOperation(forKey: "getWSQImage") { (savedAtIndex: Int32) in
      self.identifiInstance.getWSQEncodedFpImageFromImageSaved(at: savedAtIndex, croppedImage: false)
    })

    AsyncFunction("getSegmentedFpImage", asyncOperation(forKey: "getSegmentedFpImage") { (savedAtIndex: Int32) in
      self.identifiInstance.getSegmentedFpImageSaved(at: savedAtIndex)
    })

    AsyncFunction("getIrisPowerStatus", asyncOperation(forKey: "getIrisPowerStatus") {
      self.identifiInstance.getIrisPowerStatus()
    })

    AsyncFunction("setIrisPowerOn", asyncOperation(forKey: "setIrisPowerOn") {
      self.identifiInstance.setIrisPowerOn()
    })

    AsyncFunction("setIrisPowerOff", asyncOperation(forKey: "setIrisPowerOff") {
      self.identifiInstance.setIrisPowerOff()
    })
  }

  public func handleConnection() {
    if let promise = self.promises["connect"] {
      promise.resolve("Connected")
      self.promises["connect"] = nil
    }
  }

  public func handleConnectionError(_ errorDescription: String) {
    if let promise = self.promises["connect"] {
      promise.reject("E_CONNECTION", errorDescription)
      self.promises["connect"] = nil
    }
  }

  public func handleConnectionTimeOut() {
    if let promise = self.promises["connect"] {
      promise.reject("E_CONNECTION_TIMEOUT", "Connection timeout")
      self.promises["connect"] = nil
    }
  }

  public func handleDisconnection() {
    if let promise = self.promises["disconnect"] {
      promise.resolve("Disconnected")
      self.promises["disconnect"] = nil
    }
  }

  public func handleStreaming(_ fpImage: UIImage) {
    ExpoIdentifiModule.fingerView?.updateImage(with: fpImage)
  }

  public func handleStreamingRolledFp(_ fpImage: UIImage, rollingState currentState: Int32, verticalLineX currentXPosition: Int32) {
    ExpoIdentifiModule.fingerView?.updateImage(with: fpImage, rollingState: currentState, verticalLineX: currentXPosition)
  }

  public func handleCaptureStatus(_ captureStatus: Int32) {
    guard captureStatus != 1 else { return }

    captureError = String(captureStatus)
    captureGroup.leave()
    captureGroup.leave()
  }

  public func handleGetBatteryPercentage(_ batteryPercentage: Int32) {
    if let promise = self.promises["battery"] {
      promise.resolve(String(batteryPercentage))
      self.promises["battery"] = nil
    }
  }

  public func handleGetDeviceSerialNumber(_ serialNumber: String) {
    if let promise = self.promises["serial"] {
      promise.resolve(serialNumber)
      self.promises["serial"] = nil
    }
  }

  public func handleGetModelNumber(_ modelNumber: String) {
    if let promise = self.promises["modelNumber"] {
      promise.resolve(modelNumber)
      self.promises["modelNumber"] = nil
    }
  }

  public func handleCancelFpCapture() {
    if let promise = self.promises["cancelFpCapture"] {
      self.captureError = "cancelled"
      self.captureGroup.leave()
      self.captureGroup.leave()
      promise.resolve("Capture cancelled")
      self.promises["cancelFpCapture"] = nil
      return
    }

    if self.promises["capture"] != nil {
      self.captureError = "cancelled"
      self.captureGroup.leave()
      self.captureGroup.leave()
    }
  }

  public func handleSavedFpImagesCleared(_ savedAtIndex: Int32) {
    if let promise = self.promises["clearSavedFpImages"] {
      promise.resolve("Saved FP images cleared")
      self.promises["clearSavedFpImages"] = nil
    }
  }

  public func handleLastFrame(_ fpImage: UIImage, savedAtIndex: Int32) {
    self.imageData = fpImage
    self.captureGroup.leave()
  }

  public func handleLastFrame_RAW(_ rawFpImageData: Data, savedAtIndex: Int32) {
    self.imageData_RAW = rawFpImageData as NSData
    self.captureGroup.leave()
  }

  public func handleSetMinimumNFIQScore(_ minimumNFIQScore: Int32) {
    if let promise = self.promises["setMinimumNFIQScore"] {
      promise.resolve("Minimum NFIQ score set to \(minimumNFIQScore)")
      self.promises["setMinimumNFIQScore"] = nil
    }
  }

  public func handleGetNfiqScore(_ nfiqScore: Int32, savedAtIndex: Int32) {
    if let promise = self.promises["getNfiqScore"] {
      promise.resolve(String(nfiqScore))
      self.promises["getNfiqScore"] = nil
    }
  }

  public func handleGetWSQEncodedFpImage(_ wsqEncodedFpImage: Data, savedAtIndex: Int32) {
    if let promise = self.promises["getWSQImage"] {
      promise.resolve(wsqEncodedFpImage.base64EncodedString(options: []))
      self.promises["getWSQImage"] = nil
    }
  }

  public func handleGetSegmentedFpImage(_ segmentedFpImage: UIImage) {
    if let promise = self.promises["getSegmentedFpImage"] {
      promise.resolve(segmentedFpImage.pngData()?.base64EncodedString(options: []))
      self.promises["getSegmentedFpImage"] = nil
    }
  }

  public func handleGetIrisPowerStatus(_ irisPowerStatus: Bool) {
    if let promise = self.promises["getIrisPowerStatus"] {
      promise.resolve(irisPowerStatus)
      self.promises["getIrisPowerStatus"] = nil
    }
  }

  public func handleSetIrisPowerOn(_ irisPowerStatus: Bool) {
    if let promise = self.promises["setIrisPowerOn"] {
      promise.resolve(irisPowerStatus)
      self.promises["setIrisPowerOn"] = nil
    }
  }

  public func handleSetIrisPowerOff() {
    if let promise = self.promises["setIrisPowerOff"] {
      promise.resolve("Iris sensor powered off")
      self.promises["setIrisPowerOff"] = nil
    }
  }

  public func handleIrisCaptureStatus(_ irisCaptureStatus: Int32) {
    if irisCaptureStatus == 1 {
      didEmitIrisStarted = true
    }

    self.sendEvent("onIrisCaptureStatus", [
      "irisCaptureStatus": Int(irisCaptureStatus)
    ])

    switch irisCaptureStatus {
    case 1, 2, 3:
      return
    case 5:
      rejectIrisCapture(code: "E_IRIS_CAPTURE", message: "cancelled")
    case 9:
      rejectIrisCapture(code: "E_IRIS_CAPTURE", message: "9")
    default:
      rejectIrisCapture(code: "E_IRIS_CAPTURE", message: String(irisCaptureStatus))
    }
  }

  public func handleStreamingLeftIris(_ leftIrisImage: UIImage, rightIris rightIrisImage: UIImage) {
    if self.promises["irisCapture"] != nil && !didEmitIrisStarted {
      didEmitIrisStarted = true
      self.sendEvent("onIrisCaptureStatus", ["irisCaptureStatus": 1])
    }

    if !didEmitIrisPreviewFrame {
      didEmitIrisPreviewFrame = true
      self.sendEvent("onIrisPreviewFrame", [:])
    }
    ExpoIdentifiModule.leftIrisView?.updateImage(with: leftIrisImage)
    ExpoIdentifiModule.rightIrisView?.updateImage(with: rightIrisImage)
  }

  public func handleLastFrameLeftIris(
    _ leftIrisImage: UIImage,
    rightIris rightIrisImage: UIImage,
    leftIrisTotalScore leftTotalScore: Int32,
    leftIrisUsableArea leftUsabeArea: Int32,
    rightIrisTotalScore rightTotalScore: Int32,
    rightIrisUsableArea rightUsabeArea: Int32
  ) {
    ExpoIdentifiModule.leftIrisView?.updateImage(with: leftIrisImage)
    ExpoIdentifiModule.rightIrisView?.updateImage(with: rightIrisImage)

    guard let promise = self.promises["irisCapture"] else { return }
    guard
      let leftPngData = leftIrisImage.pngData(),
      let rightPngData = rightIrisImage.pngData()
    else {
      promise.reject("E_IRIS_CAPTURE", "Failed to get iris image data")
      self.promises["irisCapture"] = nil
      return
    }

    let result: [String: Any] = [
      "leftImage": leftPngData.base64EncodedString(options: []),
      "rightImage": rightPngData.base64EncodedString(options: []),
      "leftTotalScore": Int(leftTotalScore),
      "leftUsableArea": Int(leftUsabeArea),
      "rightTotalScore": Int(rightTotalScore),
      "rightUsableArea": Int(rightUsabeArea),
      "imageHeight": 480,
      "imageWidth": 640,
      "horizontalPixelDensity": 0,
      "verticalPixelDensity": 0,
      "imageBitsPerPixelQuantity": 8,
    ]

    promise.resolve(result)
    self.promises["irisCapture"] = nil
    resetIrisCaptureState()
  }

  public func handleCancelIrisCapture() {
    if let promise = self.promises["cancelIrisCapture"] {
      promise.resolve("Iris capture cancelled")
      self.promises["cancelIrisCapture"] = nil
    }

    if self.promises["irisCapture"] != nil {
      rejectIrisCapture(code: "E_IRIS_CAPTURE", message: "cancelled")
    } else {
      resetIrisCaptureState()
    }
  }

  private func asyncOperation(forKey key: String, operation: @escaping () -> Void) -> (Promise) -> Void {
    return { promise in
      self.promises[key] = promise
      DispatchQueue.main.async {
        operation()
      }
    }
  }

  private func asyncOperation<T>(forKey key: String, operation: @escaping (T) -> Void) -> (T, Promise) -> Void {
    return { param, promise in
      self.promises[key] = promise
      DispatchQueue.main.async {
        operation(param)
      }
    }
  }

  private func initializeCaptureGroup() {
    captureGroup.enter()
    captureGroup.enter()

    captureGroup.notify(queue: .main) {
      self.handleCaptureResult()
    }
  }

  private func handleCaptureResult() {
    guard let promise = promises["capture"] else { return }

    defer {
      resetCaptureState()
    }

    if let error = captureError {
      promise.reject("E_CAPTURE", error)
      return
    }

    guard let rawData = imageData_RAW,
          let imageData = imageData,
          let pngData = imageData.pngData()
    else {
      promise.reject("E_CAPTURE", "Failed to get image data")
      return
    }

    let result: [String: Any] = [
      "raw": rawData.base64EncodedString(options: []),
      "image": pngData.base64EncodedString(options: [])
    ]

    promise.resolve(result)
  }

  private func resetCaptureState() {
    promises["capture"] = nil
    captureError = nil
    imageData = nil
    imageData_RAW = nil
  }

  private func rejectIrisCapture(code: String, message: String) {
    if let promise = self.promises["irisCapture"] {
      promise.reject(code, message)
      self.promises["irisCapture"] = nil
    }
    resetIrisCaptureState()
  }

  private func resetIrisCaptureState() {
    didEmitIrisStarted = false
    didEmitIrisPreviewFrame = false
  }
}
