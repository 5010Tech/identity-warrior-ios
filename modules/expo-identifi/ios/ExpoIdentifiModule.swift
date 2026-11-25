import AudioToolbox
import ExpoModulesCore
import SlapshotCaptureSDK
import UIKit

public class ExpoIdentifiModule: Module {
  private var identifiInstance: IdentiFI = IdentiFI()
  private var promises: [String: Promise] = [:]
  private let delegateAdapter: IdentiFIDelegateAdapter = IdentiFIDelegateAdapter()

  // The capture in hand is over when the scanner has sent its last frame in
  // both forms (picture and raw), or reports an error, or is cancelled.
  private var gotLastFrame = false
  private var gotLastFrameRaw = false
  private var lastFrameTimer: Timer?
  private var captureError: String?
  private var lastFrameImage: UIImage?

  // Progress of the fingerprint capture in hand, for the screen: the preview
  // stopping (the scanner has its image and is sending it) and the image
  // arriving.
  private var captureActive = false
  private var lastStreamAt: Date?
  private var streamStalled = false
  private var captureCompleteSent = false
  private var streamWatch: Timer?

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

    Events(["onStreaming", "onIrisCaptureStatus", "onIrisPreviewFrame", "onFpCaptureProgress", "onScannerDebug"])

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
      self.beginCapture()
      self.identifiInstance.startCaptureOneFinger(savedAtIndex)
    })

    AsyncFunction("startCaptureTwoFinger", asyncOperation(forKey: "capture") { (savedAtIndex: Int32) in
      self.beginCapture()
      self.identifiInstance.startCaptureTwoFinger(savedAtIndex)
    })

    AsyncFunction("startCaptureFourFinger", asyncOperation(forKey: "capture") { (savedAtIndex: Int32) in
      self.beginCapture()
      self.identifiInstance.startCaptureFourFinger(savedAtIndex)
    })

    AsyncFunction("startCaptureRollFinger", asyncOperation(forKey: "capture") { (savedAtIndex: Int32) in
      self.beginCapture()
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

    // The whole frame of the capture just finished, as the scanner showed
    // it: a PNG for the screen and a WSQ (500 ppi, 15:1) for the EBTS file.
    // For MAP and CAR, where a slap is kept as one four-finger image.
    AsyncFunction("getLastFrame") { (promise: Promise) in
      DispatchQueue.main.async {
        guard let image = self.lastFrameImage, let cgImage = image.cgImage else {
          promise.resolve(nil)
          return
        }
        DispatchQueue.global(qos: .userInitiated).async {
          let width = cgImage.width
          let height = cgImage.height
          // Eight-bit grey, top row first: what the WSQ encoder takes.
          var pixels = [UInt8](repeating: 255, count: width * height)
          let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
            guard let context = CGContext(
              data: buffer.baseAddress, width: width, height: height,
              bitsPerComponent: 8, bytesPerRow: width,
              space: CGColorSpaceCreateDeviceGray(),
              bitmapInfo: CGImageAlphaInfo.none.rawValue
            ) else { return false }
            context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
            return true
          }
          guard drawn else {
            promise.reject("E_FRAME", "Could not read the captured image")
            return
          }
          var encoded: UnsafeMutablePointer<UInt8>? = nil
          var encodedLength: Int32 = 0
          let status = pixels.withUnsafeMutableBufferPointer { buffer in
            wsq_encode_mem(
              &encoded, &encodedLength, 0.75, buffer.baseAddress,
              Int32(width), Int32(height), 8, 500, nil
            )
          }
          guard status == 0, let encoded, encodedLength > 0 else {
            promise.reject("E_WSQ", "Could not encode the captured image (\(status))")
            return
          }
          let wsq = Data(bytes: encoded, count: Int(encodedLength))
          free(encoded)
          promise.resolve([
            "png": image.pngData()?.base64EncodedString() ?? "",
            "wsq": wsq.base64EncodedString(),
            "width": width,
            "height": height,
          ])
        }
      }
    }

    AsyncFunction("getFirmwareVersion", asyncOperation(forKey: "firmware") {
      self.identifiInstance.getFirmwareVersion()
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

    // One finger from the last capture with its WSQ and quality score worked
    // out here on the phone, so the scanner is asked for the image only.
    AsyncFunction("getSegmentedFpPrint", asyncOperation(forKey: "getSegmentedFpPrint") { (savedAtIndex: Int32) in
      self.identifiInstance.getSegmentedFpImageSaved(at: savedAtIndex)
    })

    // The fingerprint sensor's power, checked before a capture as the
    // Android app does: a sensor that has powered down does not capture.
    AsyncFunction("getFpPowerStatus", asyncOperation(forKey: "getFpPowerStatus") {
      self.identifiInstance.getFpPowerStatus()
    })

    AsyncFunction("setFpPowerOn", asyncOperation(forKey: "setFpPowerOn") {
      self.identifiInstance.setFpPowerOn()
    })

    AsyncFunction("setFpPowerOff", asyncOperation(forKey: "setFpPowerOff") {
      self.identifiInstance.setFpPowerOff()
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
    countFrame("fingerprint")
    noteStreamFrame()
    ExpoIdentifiModule.fingerView?.updateImage(with: fpImage)
  }

  public func handleStreamingRolledFp(_ fpImage: UIImage, rollingState currentState: Int32, verticalLineX currentXPosition: Int32) {
    noteStreamFrame()
    ExpoIdentifiModule.fingerView?.updateImage(with: fpImage, rollingState: currentState, verticalLineX: currentXPosition)
  }

  public func handleCaptureStatus(_ captureStatus: Int32) {
    DispatchQueue.main.async {
      // Let the screen (and the field log) know what the scanner reported.
      self.sendEvent("onFpCaptureProgress", ["state": "status", "status": Int(captureStatus)])
      // A status is a notice, not the end of the capture: the print was
      // below the minimum quality, or a roll smeared and has to be done
      // again. The scanner keeps going, so the capture does too, as in the
      // Android app, which only notes these. The capture ends with its last
      // frame, a cancel, or the screen giving up on it.
    }
  }

  public func handleGetFirmwareVersion(_ version: String) {
    if let promise = self.promises["firmware"] {
      promise.resolve(version)
      self.promises["firmware"] = nil
    }
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
    DispatchQueue.main.async {
      if let promise = self.promises["cancelFpCapture"] {
        promise.resolve("Capture cancelled")
        self.promises["cancelFpCapture"] = nil
      }
      if self.promises["capture"] != nil {
        self.captureError = "cancelled"
        self.finishCapture()
      }
    }
  }

  public func handleSavedFpImagesCleared(_ savedAtIndex: Int32) {
    if let promise = self.promises["clearSavedFpImages"] {
      promise.resolve("Saved FP images cleared")
      self.promises["clearSavedFpImages"] = nil
    }
  }

  public func handleLastFrame(_ fpImage: UIImage, savedAtIndex: Int32) {
    noteCaptureComplete()
    DispatchQueue.main.async {
      // Kept until the next capture: the whole frame (a four-finger slap as
      // one image) can be asked for with getLastFrame.
      if fpImage.cgImage != nil {
        self.lastFrameImage = fpImage
      }
      self.gotLastFrame = true
      self.lastFrameArrived()
    }
  }

  public func handleLastFrame_RAW(_ rawFpImageData: Data, savedAtIndex: Int32) {
    noteCaptureComplete()
    DispatchQueue.main.async {
      self.gotLastFrameRaw = true
      self.lastFrameArrived()
    }
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
    if let promise = self.promises["getSegmentedFpPrint"] {
      self.promises["getSegmentedFpPrint"] = nil
      DispatchQueue.global(qos: .userInitiated).async {
        self.resolvePrint(segmentedFpImage, promise: promise)
      }
    }
  }

  /// Eight-bit grey pixels of an image, top row first, as the PNG shows it.
  private func greyPixels(of cgImage: CGImage) -> [UInt8]? {
    let width = cgImage.width
    let height = cgImage.height
    var pixels = [UInt8](repeating: 255, count: width * height)
    let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
      guard let context = CGContext(
        data: buffer.baseAddress, width: width, height: height,
        bitsPerComponent: 8, bytesPerRow: width,
        space: CGColorSpaceCreateDeviceGray(),
        bitmapInfo: CGImageAlphaInfo.none.rawValue
      ) else { return false }
      context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
      return true
    }
    return drawn ? pixels : nil
  }

  /// PNG, WSQ (500 ppi, 15:1) and NFIQ score of one finger image.
  private func resolvePrint(_ image: UIImage, promise: Promise) {
    guard let cgImage = image.cgImage, var pixels = greyPixels(of: cgImage) else {
      promise.reject("E_PRINT", "Could not read the fingerprint image")
      return
    }
    let width = Int32(cgImage.width)
    let height = Int32(cgImage.height)

    var nfiq: Int32 = 0
    var confidence: Float = 0
    var flags: Int32 = 0
    let nfiqStatus = pixels.withUnsafeMutableBufferPointer { buffer in
      comp_nfiq(&nfiq, &confidence, buffer.baseAddress, width, height, 8, 500, &flags)
    }
    // A negative status is a failure; a positive one is an image with too
    // little print in it, which the scorer marks as the poorest quality.
    if nfiqStatus < 0 || nfiq < 1 || nfiq > 5 {
      promise.reject("E_NFIQ", "Could not score the fingerprint image (\(nfiqStatus))")
      return
    }

    var encoded: UnsafeMutablePointer<UInt8>? = nil
    var encodedLength: Int32 = 0
    let wsqStatus = pixels.withUnsafeMutableBufferPointer { buffer in
      wsq_encode_mem(&encoded, &encodedLength, 0.75, buffer.baseAddress, width, height, 8, 500, nil)
    }
    guard wsqStatus == 0, let encoded, encodedLength > 0 else {
      promise.reject("E_WSQ", "Could not encode the fingerprint image (\(wsqStatus))")
      return
    }
    let wsq = Data(bytes: encoded, count: Int(encodedLength))
    free(encoded)
    promise.resolve([
      "png": image.pngData()?.base64EncodedString() ?? "",
      "wsq": wsq.base64EncodedString(),
      "nfiq": Int(nfiq),
      "width": Int(width),
      "height": Int(height),
    ])
  }

  /// No finger image at the requested index: resolves with nil.
  public func handleGetSegmentedFpImageMissing() {
    if let promise = self.promises["getSegmentedFpImage"] {
      promise.resolve(nil)
      self.promises["getSegmentedFpImage"] = nil
    }
    if let promise = self.promises["getSegmentedFpPrint"] {
      promise.resolve(nil)
      self.promises["getSegmentedFpPrint"] = nil
    }
  }

  public func handleFpPower(_ on: Bool, forKey key: String) {
    if let promise = self.promises[key] {
      promise.resolve(on)
      self.promises[key] = nil
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
    countFrame(
      "iris (\(Int(leftIrisImage.size.width))x\(Int(leftIrisImage.size.height)), views \(ExpoIdentifiModule.leftIrisView == nil ? "missing" : "ok")/\(ExpoIdentifiModule.rightIrisView == nil ? "missing" : "ok"), brightness \(ExpoIdentifiModule.brightness(of: leftIrisImage))/\(ExpoIdentifiModule.brightness(of: rightIrisImage)))"
    )
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
        self.debug("send \(key)")
        operation()
      }
    }
  }

  private func asyncOperation<T>(forKey key: String, operation: @escaping (T) -> Void) -> (T, Promise) -> Void {
    return { param, promise in
      self.promises[key] = promise
      DispatchQueue.main.async {
        self.debug("send \(key)")
        operation(param)
      }
    }
  }

  private func noteStreamFrame() {
    DispatchQueue.main.async {
      guard self.captureActive else { return }
      self.lastStreamAt = Date()
      if self.streamStalled {
        self.streamStalled = false
        self.sendEvent("onFpCaptureProgress", ["state": "streaming"])
      }
    }
  }

  /// The captured image has arrived: tell the screen and the operator, once.
  private func noteCaptureComplete() {
    DispatchQueue.main.async {
      guard self.captureActive, !self.captureCompleteSent else { return }
      self.captureCompleteSent = true
      self.stopStreamWatch()
      // Two short tones and a tap, like the Android app's double beep.
      AudioServicesPlaySystemSound(1057)
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.18) {
        AudioServicesPlaySystemSound(1057)
      }
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      self.sendEvent("onFpCaptureProgress", ["state": "complete"])
    }
  }

  private func startStreamWatch() {
    captureActive = true
    lastStreamAt = nil
    streamStalled = false
    captureCompleteSent = false
    streamWatch?.invalidate()
    // The preview stopping after it had started means the scanner has taken
    // its image and is sending it over.
    streamWatch = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
      guard let self, self.captureActive, !self.streamStalled,
            let last = self.lastStreamAt,
            Date().timeIntervalSince(last) > 0.7
      else { return }
      self.streamStalled = true
      self.sendEvent("onFpCaptureProgress", ["state": "stalled"])
    }
  }

  private func stopStreamWatch() {
    streamWatch?.invalidate()
    streamWatch = nil
  }

  // For the field log: what is sent to the scanner and what comes back, so a
  // scanner that stops answering shows up as exactly that.
  private var frameCount = 0
  private var frameCountSince = Date()

  /// How bright a frame is on average, 0 (black) to 255 (white): tells a
  /// preview that is arriving but dark from one that is not arriving.
  static func brightness(of image: UIImage) -> Int {
    guard let cgImage = image.cgImage else { return -1 }
    var pixel: UInt8 = 0
    guard let context = CGContext(
      data: &pixel, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 1,
      space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue
    ) else { return -1 }
    context.interpolationQuality = .low
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: 1, height: 1))
    return Int(pixel)
  }

  public func debug(_ message: String) {
    DispatchQueue.main.async {
      self.sendEvent("onScannerDebug", ["message": message])
    }
  }

  /// Preview frames are counted, not logged one by one.
  private func countFrame(_ kind: String) {
    DispatchQueue.main.async {
      self.frameCount += 1
      let elapsed = Date().timeIntervalSince(self.frameCountSince)
      if elapsed >= 3 {
        self.sendEvent("onScannerDebug", [
          "message": "\(kind) preview: \(self.frameCount) frame(s) in \(Int(elapsed)) s"
        ])
        self.frameCount = 0
        self.frameCountSince = Date()
      }
    }
  }

  private func beginCapture() {
    DispatchQueue.main.async {
      // A fresh start whatever became of the capture before it.
      self.captureError = nil
      self.lastFrameImage = nil
      self.gotLastFrame = false
      self.gotLastFrameRaw = false
      self.lastFrameTimer?.invalidate()
      self.lastFrameTimer = nil
      self.startStreamWatch()
    }
  }

  /// One form of the last frame is in. The capture is over when both are, or
  /// shortly after the first if the other never comes.
  private func lastFrameArrived() {
    if gotLastFrame && gotLastFrameRaw {
      finishCapture()
      return
    }
    guard lastFrameTimer == nil else { return }
    lastFrameTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: false) { [weak self] _ in
      self?.finishCapture()
    }
  }

  /// Answers the capture request, once: with the error if there was one.
  private func finishCapture() {
    lastFrameTimer?.invalidate()
    lastFrameTimer = nil
    captureActive = false
    stopStreamWatch()
    guard let promise = promises["capture"] else { return }
    promises["capture"] = nil
    let error = captureError
    captureError = nil
    if let error {
      promise.reject("E_CAPTURE", error)
      return
    }
    // The captured frame stays on the scanner; the app then asks for each
    // finger's image, score and WSQ. The whole frame is not sent to the
    // screen: encoding it as PNG and base64 only delayed every capture.
    promise.resolve(["captured": true])
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
