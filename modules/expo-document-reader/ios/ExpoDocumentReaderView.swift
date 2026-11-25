import AVFoundation
import CoreImage
import ExpoModulesCore
import UIKit
import Vision

class ExpoDocumentReaderView: ExpoView, AVCaptureMetadataOutputObjectsDelegate, AVCaptureVideoDataOutputSampleBufferDelegate {
  private let requiredStableMrzReads = 2
  private let minimumMrzEmitRowCount = 2
  private let minimumMrzEmitRowLength = 36
  private struct MrzCropResult {
    let fullImage: CGImage
    let imageSize: CGSize
    let cropImage: CGImage
    let normalizedFrameRect: CGRect
    let viewFrameRect: CGRect
  }

  private let session = AVCaptureSession()
  private let metadataOutput = AVCaptureMetadataOutput()
  private let videoOutput = AVCaptureVideoDataOutput()
  private let sessionQueue = DispatchQueue(label: "expo.documentreader.session", qos: .userInitiated)
  private let videoQueue = DispatchQueue(label: "expo.documentreader.video", qos: .userInitiated)
  private var previewLayer: AVCaptureVideoPreviewLayer?
  private var device: AVCaptureDevice?
  private var didConfigureSession = false
  private var hasEmittedScan = false
  private var permissionRequested = false
  private var lastMrzProcessingTime: CFTimeInterval = 0
  private var isProcessingMrzFrame = false
  private var currentGuidance: String?
  private var guidanceResetTimer: DispatchSourceTimer?
  private var lastSignalTime: CFTimeInterval = 0
  private var pendingBarcodeValue: String?
  private var pendingBarcodeCount = 0
  private var pendingMrzText: String?
  private var pendingMrzCount = 0
  private var pendingMrzLastSeenTime: CFTimeInterval = 0
  private var readingGuidanceUntil: CFTimeInterval = 0
  private var lastStrongMrzTime: CFTimeInterval = 0
  private var lastLoggedNoSignalBucket: Int = -1
  private var currentCandidateBox: CGRect?
  private var currentMrzCropRect: CGRect?
  private let ciContext = CIContext(options: nil)
  private var lastHandledDebugCaptureToken = 0
  private var pendingDebugCapture = false
  /// How the phone is held, going by the interface: 0 upright, 1 on its side
  /// with its top to the left, -1 on its side with its top to the right. The
  /// camera frame is turned to match before the zone is read, so the text is
  /// always the right way up for the recognizer.
  private var readingTurn = 0

  let onBarcodeScanned = EventDispatcher()
  let onMrzScanned = EventDispatcher()
  let onScanFeedback = EventDispatcher()
  let onDebugCapture = EventDispatcher()
  let onMrzCandidates = EventDispatcher()

  /// Strict reading: every frame's text lines go to JavaScript, which
  /// accepts a zone only when its check digits hold, and this view no
  /// longer announces a zone on its own looser reading.
  var strictMrz: Bool = false

  var debugCaptureToken: Int = 0 {
    didSet {
      guard debugCaptureToken != lastHandledDebugCaptureToken else {
        return
      }
      pendingDebugCapture = true
    }
  }

  var scanMode: String = "pdf417" {
    didSet {
      log("scanMode changed to \(scanMode)")
      hasEmittedScan = false
      currentGuidance = nil
      currentCandidateBox = nil
      pendingBarcodeValue = nil
      pendingBarcodeCount = 0
      pendingMrzText = nil
      pendingMrzCount = 0
      pendingMrzLastSeenTime = 0
      readingGuidanceUntil = 0
      lastStrongMrzTime = 0
      lastLoggedNoSignalBucket = -1
      currentMrzCropRect = nil
      emitGuidance("searching", candidateBox: nil)
      updateOutputsForCurrentMode()
      updateRectOfInterest()
    }
  }

  var isScanningEnabled: Bool = true {
    didSet {
      log("isScanningEnabled changed to \(isScanningEnabled)")
      if isScanningEnabled {
        hasEmittedScan = false
        currentGuidance = nil
        currentCandidateBox = nil
        pendingBarcodeValue = nil
        pendingBarcodeCount = 0
        pendingMrzText = nil
        pendingMrzCount = 0
        pendingMrzLastSeenTime = 0
        readingGuidanceUntil = 0
        lastStrongMrzTime = 0
        lastLoggedNoSignalBucket = -1
        currentMrzCropRect = nil
        emitGuidance("searching", candidateBox: nil)
      }
      updateRunningState()
    }
  }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .black
    configureIfPossible()
    emitGuidance("searching", candidateBox: nil)
    installNotifications()
  }

  deinit {
    guidanceResetTimer?.cancel()
    NotificationCenter.default.removeObserver(self)
    log("deinit")
  }

  private func log(_ message: String) {
    print("[ExpoDocumentReaderView] \(message)")
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = bounds
    updatePreviewRotation()
    updateRectOfInterest()
  }

  /// The interface turns with the phone on the scan screens, so the camera
  /// picture has to turn with it or the scene shows on its side. Also notes
  /// which way round a sideways phone is, for reading the zone (see
  /// makePortraitImage).
  private func updatePreviewRotation() {
    let orientation = window?.windowScene?.interfaceOrientation ?? .portrait
    let turn: Int
    switch orientation {
    case .landscapeRight:
      turn = 1
    case .landscapeLeft:
      turn = -1
    default:
      turn = 0
    }
    if turn != readingTurn {
      readingTurn = turn
      // Where the zone was in the frame no longer holds once it has turned.
      currentMrzCropRect = nil
    }

    let angle: CGFloat
    switch orientation {
    case .landscapeRight:
      angle = 0
    case .landscapeLeft:
      angle = 180
    case .portraitUpsideDown:
      angle = 270
    default:
      angle = 90
    }

    guard let connection = previewLayer?.connection else {
      return
    }
    if #available(iOS 17.0, *) {
      if connection.isVideoRotationAngleSupported(angle) {
        connection.videoRotationAngle = angle
      }
    }
  }

  private func installNotifications() {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleSubjectAreaDidChange),
      name: AVCaptureDevice.subjectAreaDidChangeNotification,
      object: nil
    )

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleSessionRuntimeError(_:)),
      name: .AVCaptureSessionRuntimeError,
      object: session
    )

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleSessionWasInterrupted(_:)),
      name: .AVCaptureSessionWasInterrupted,
      object: session
    )

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleSessionInterruptionEnded(_:)),
      name: .AVCaptureSessionInterruptionEnded,
      object: session
    )
  }

  @objc
  private func handleSubjectAreaDidChange() {
    log("subject area did change")
  }

  @objc
  private func handleSessionRuntimeError(_ notification: Notification) {
    let error = (notification.userInfo?[AVCaptureSessionErrorKey] as? NSError)?.localizedDescription ?? "unknown"
    log("session runtime error: \(error)")
  }

  @objc
  private func handleSessionWasInterrupted(_ notification: Notification) {
    let rawReason = notification.userInfo?[AVCaptureSessionInterruptionReasonKey] as? NSNumber
    log("session interrupted reason=\(rawReason?.intValue ?? -1)")
  }

  @objc
  private func handleSessionInterruptionEnded(_ notification: Notification) {
    log("session interruption ended")
  }

  private func configureIfPossible() {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      configureSessionIfNeeded()
    case .notDetermined:
      requestPermissionIfNeeded()
    default:
      break
    }
  }

  private func requestPermissionIfNeeded() {
    guard !permissionRequested else {
      return
    }
    permissionRequested = true

    AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
      guard granted else {
        return
      }
      DispatchQueue.main.async {
        self?.configureSessionIfNeeded()
      }
    }
  }

  private func configureSessionIfNeeded() {
    log("configureSessionIfNeeded")
    guard !didConfigureSession else {
      updateRunningState()
      return
    }

    didConfigureSession = true

    session.beginConfiguration()
    // 4K where the camera has it: with the phone upright the zone runs
    // across the short side of the frame, and at 1080p its characters are
    // too small to read reliably (laser-engraved zones especially).
    if session.canSetSessionPreset(.hd4K3840x2160) {
      session.sessionPreset = .hd4K3840x2160
    } else if session.canSetSessionPreset(.hd1920x1080) {
      session.sessionPreset = .hd1920x1080
    } else if session.canSetSessionPreset(.high) {
      session.sessionPreset = .high
    }
    log("session preset set to \(session.sessionPreset.rawValue)")

    defer {
      session.commitConfiguration()
      installPreviewLayerIfNeeded()
      updateOutputsForCurrentMode()
      updateRectOfInterest()
      updateRunningState()
      startGuidanceResetTimerIfNeeded()
    }

    guard let selectedDevice = preferredCaptureDevice() else {
      log("no capture device available")
      return
    }
    device = selectedDevice

    do {
      let dimensions = CMVideoFormatDescriptionGetDimensions(selectedDevice.activeFormat.formatDescription)
      log("selected device=\(selectedDevice.localizedName) activeFormat=\(dimensions.width)x\(dimensions.height)")
      let input = try AVCaptureDeviceInput(device: selectedDevice)
      if session.canAddInput(input) {
        session.addInput(input)
      }

      try selectedDevice.lockForConfiguration()
      if selectedDevice.isFocusModeSupported(.continuousAutoFocus) {
        selectedDevice.focusMode = .continuousAutoFocus
      }
      if selectedDevice.isAutoFocusRangeRestrictionSupported {
        selectedDevice.autoFocusRangeRestriction = .none
      }
      if selectedDevice.isSmoothAutoFocusSupported {
        selectedDevice.isSmoothAutoFocusEnabled = true
      }
      if selectedDevice.isExposureModeSupported(.continuousAutoExposure) {
        selectedDevice.exposureMode = .continuousAutoExposure
      }
      if !selectedDevice.isSubjectAreaChangeMonitoringEnabled {
        selectedDevice.isSubjectAreaChangeMonitoringEnabled = true
      }
      if selectedDevice.isFocusPointOfInterestSupported {
        selectedDevice.focusPointOfInterest = CGPoint(x: 0.5, y: 0.5)
      }
      if selectedDevice.isExposurePointOfInterestSupported {
        selectedDevice.exposurePointOfInterest = CGPoint(x: 0.5, y: 0.5)
      }
      selectedDevice.unlockForConfiguration()
      applyZoomForCurrentMode()
    } catch {
      print("ExpoDocumentReaderView failed to configure camera input: \(error)")
      return
    }

    if session.canAddOutput(metadataOutput) {
      session.addOutput(metadataOutput)
      metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
      log("metadataOutput available types: \(metadataOutput.availableMetadataObjectTypes.map { $0.rawValue }.joined(separator: ", "))")
    }

    videoOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
    videoOutput.alwaysDiscardsLateVideoFrames = true
    if session.canAddOutput(videoOutput) {
      session.addOutput(videoOutput)
    }

    if let metadataConnection = metadataOutput.connection(with: .video) {
      if #available(iOS 17.0, *) {
        if metadataConnection.isVideoRotationAngleSupported(90) {
          metadataConnection.videoRotationAngle = 90
        }
      } else if metadataConnection.isVideoOrientationSupported {
        metadataConnection.videoOrientation = .portrait
      }
    }

    if let videoConnection = videoOutput.connection(with: .video) {
      if #available(iOS 17.0, *) {
        if videoConnection.isVideoRotationAngleSupported(90) {
          videoConnection.videoRotationAngle = 90
        }
      } else if videoConnection.isVideoOrientationSupported {
        videoConnection.videoOrientation = .portrait
      }
    }
  }

  private func preferredCaptureDevice() -> AVCaptureDevice? {
    let preferredTypes: [AVCaptureDevice.DeviceType] = [.builtInWideAngleCamera, .builtInDualWideCamera, .builtInTripleCamera]
    for type in preferredTypes {
      let discoverySession = AVCaptureDevice.DiscoverySession(
        deviceTypes: [type],
        mediaType: .video,
        position: .back
      )
      if let device = discoverySession.devices.first {
        log("preferredCaptureDevice selected type=\(type.rawValue) name=\(device.localizedName)")
        return device
      }
    }

    let fallback = AVCaptureDevice.default(for: .video)
    if let fallback {
      log("preferredCaptureDevice fallback name=\(fallback.localizedName)")
    }
    return fallback
  }

  private func installPreviewLayerIfNeeded() {
    guard previewLayer == nil else {
      previewLayer?.frame = bounds
      return
    }

    let previewLayer = AVCaptureVideoPreviewLayer(session: session)
    previewLayer.videoGravity = .resizeAspectFill
    previewLayer.frame = bounds
    layer.insertSublayer(previewLayer, at: 0)
    self.previewLayer = previewLayer
  }

  private func updateOutputsForCurrentMode() {
    guard didConfigureSession else {
      return
    }

    let normalizedMode = scanMode.lowercased()
    if normalizedMode == "pdf417" {
      let availableTypes = Set(metadataOutput.availableMetadataObjectTypes)
      let requestedTypes: [AVMetadataObject.ObjectType] = [.pdf417]
      let supportedTypes = requestedTypes.filter { availableTypes.contains($0) }
      metadataOutput.metadataObjectTypes = supportedTypes
      log("metadata types set for pdf417 mode: \(supportedTypes.map { $0.rawValue }.joined(separator: ", "))")
    } else {
      metadataOutput.metadataObjectTypes = []
      log("metadata types cleared for MRZ mode")
    }
    videoOutput.setSampleBufferDelegate(normalizedMode == "mrz" ? self : nil, queue: normalizedMode == "mrz" ? videoQueue : nil)
    applyZoomForCurrentMode()
  }

  private func applyZoomForCurrentMode() {
    guard let device else {
      return
    }

    do {
      try device.lockForConfiguration()
      let maxZoom = max(1.0, min(device.maxAvailableVideoZoomFactor, device.activeFormat.videoZoomFactorUpscaleThreshold > 0 ? device.activeFormat.videoZoomFactorUpscaleThreshold : device.maxAvailableVideoZoomFactor))
      let normalizedMode = scanMode.lowercased()
      let targetZoom: CGFloat = normalizedMode == "pdf417" ? min(1.5, maxZoom) : 1.0
      if device.isAutoFocusRangeRestrictionSupported {
        device.autoFocusRangeRestriction = (normalizedMode == "mrz" || normalizedMode == "pdf417") ? .near : .none
      }
      device.videoZoomFactor = max(1.0, targetZoom)
      device.unlockForConfiguration()
      log("applied zoom factor \(device.videoZoomFactor) for mode \(scanMode) focusRange=\(device.autoFocusRangeRestriction.rawValue)")
    } catch {
      log("failed to apply zoom factor: \(error)")
    }
  }

  private func updateRectOfInterest() {
    guard didConfigureSession, previewLayer != nil else {
      return
    }

    if scanMode.lowercased() != "pdf417" {
      metadataOutput.rectOfInterest = CGRect(x: 0, y: 0, width: 1, height: 1)
      log("rectOfInterest reset for MRZ mode: OCR uses cropped video frames")
      return
    }

    metadataOutput.rectOfInterest = CGRect(x: 0, y: 0, width: 1, height: 1)
    log("rectOfInterest updated for mode \(scanMode): full-frame (0,0,1,1)")
  }

  private func makePortraitImage(from pixelBuffer: CVPixelBuffer) -> CGImage? {
    let baseImage = CIImage(cvPixelBuffer: pixelBuffer)
    guard let cgImage = ciContext.createCGImage(baseImage, from: baseImage.extent) else {
      return nil
    }

    // Upright phone: the frame is already the right way up.
    let turn = readingTurn
    if turn == 0 {
      return cgImage
    }

    let sourceWidth = cgImage.width
    let sourceHeight = cgImage.height
    guard let colorSpace = cgImage.colorSpace ?? CGColorSpace(name: CGColorSpace.sRGB),
          let context = CGContext(
            data: nil,
            width: sourceHeight,
            height: sourceWidth,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
          ) else {
      return nil
    }

    context.interpolationQuality = .high
    if turn < 0 {
      // A quarter turn the other way, for a phone held the other way round.
      context.translateBy(x: 0, y: CGFloat(sourceWidth))
      context.rotate(by: -.pi / 2)
    } else {
      context.translateBy(x: CGFloat(sourceHeight), y: 0)
      context.rotate(by: .pi / 2)
    }
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: sourceWidth, height: sourceHeight))

    return context.makeImage()
  }

  private func expandedMrzCropRect(from rect: CGRect?) -> CGRect {
    guard let rect, !rect.isEmpty else {
      return CGRect(x: 0, y: 0, width: 1, height: 1)
    }

    let expanded = rect.insetBy(
      dx: -max(rect.width * 0.85, 0.08),
      dy: -max(rect.height * 0.10, 0.04)
    )

    return expanded.clampedUnitRect()
  }

  private func imageRect(fromVisionRect rect: CGRect, imageSize: CGSize) -> CGRect {
    CGRect(
      x: rect.minX * imageSize.width,
      y: (1 - rect.maxY) * imageSize.height,
      width: rect.width * imageSize.width,
      height: rect.height * imageSize.height
    )
  }

  private func croppedMrzImage(from pixelBuffer: CVPixelBuffer) -> MrzCropResult? {
    guard let portraitImage = makePortraitImage(from: pixelBuffer) else {
      return nil
    }

    let portraitSize = CGSize(width: portraitImage.width, height: portraitImage.height)
    let normalizedCropRect = expandedMrzCropRect(from: currentMrzCropRect)
    let cropRect = imageRect(fromVisionRect: normalizedCropRect, imageSize: portraitSize)
      .integral
      .intersection(CGRect(origin: .zero, size: portraitSize))
    guard cropRect.width >= 64,
          cropRect.height >= 64,
          let croppedImage = portraitImage.cropping(to: cropRect) else {
      return nil
    }

    return MrzCropResult(
      fullImage: portraitImage,
      imageSize: portraitSize,
      cropImage: croppedImage,
      normalizedFrameRect: normalizedCropRect,
      viewFrameRect: mapVisionRectToViewRect(normalizedCropRect, imageSize: portraitSize) ?? CGRect(x: 0, y: 0, width: 1, height: 1)
    )
  }

  private func jpegDataUrl(from image: CGImage, maxDimension: CGFloat, compressionQuality: CGFloat = 0.72) -> String? {
    let baseImage = UIImage(cgImage: image)
    let sourceSize = baseImage.size
    guard sourceSize.width > 0, sourceSize.height > 0 else {
      return nil
    }

    let scale = min(CGFloat(1), maxDimension / max(sourceSize.width, sourceSize.height))
    let targetSize = CGSize(width: max(CGFloat(1), floor(sourceSize.width * scale)), height: max(CGFloat(1), floor(sourceSize.height * scale)))

    let renderedImage: UIImage
    if scale < 0.999 {
      let renderer = UIGraphicsImageRenderer(size: targetSize)
      renderedImage = renderer.image { _ in
        baseImage.draw(in: CGRect(origin: .zero, size: targetSize))
      }
    } else {
      renderedImage = baseImage
    }

    guard let jpegData = renderedImage.jpegData(compressionQuality: compressionQuality) else {
      return nil
    }

    return "data:image/jpeg;base64,\(jpegData.base64EncodedString())"
  }

  private func recognizedPreview(from observations: [VNRecognizedTextObservation]) -> [String] {
    observations.prefix(5).compactMap { observation in
      observation.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines)
    }.filter { !$0.isEmpty }
  }

  private func emitDebugCapture(_ crop: MrzCropResult, observations: [VNRecognizedTextObservation]) {
    guard let fullFrameDataUrl = jpegDataUrl(from: crop.fullImage, maxDimension: 640),
          let cropFrameDataUrl = jpegDataUrl(from: crop.cropImage, maxDimension: 640) else {
      log("debug capture failed: could not encode JPEG previews")
      return
    }

    let preview = recognizedPreview(from: observations)
    let cropRectText = NSCoder.string(for: crop.normalizedFrameRect)
    log("debug capture emitted observations=\(observations.count) cropRect=\(cropRectText) preview=\(preview)")

    DispatchQueue.main.async { [weak self] in
      guard let self else {
        return
      }
      self.onDebugCapture([
        "fullFrameDataUrl": fullFrameDataUrl,
        "cropFrameDataUrl": cropFrameDataUrl,
        "cropRect": self.serialize(rect: crop.normalizedFrameRect),
        "viewFrameRect": self.serialize(rect: crop.viewFrameRect),
        "rawObservationCount": observations.count,
        "recognizedPreview": preview,
      ])
    }
  }

  private func currentViewBoundsSnapshot() -> CGRect {
    var snapshot = CGRect.zero

    let captureSnapshot = {
      snapshot = self.bounds
    }

    if Thread.isMainThread {
      captureSnapshot()
    } else {
      DispatchQueue.main.sync(execute: captureSnapshot)
    }

    return snapshot
  }

  private func mapVisionRectToViewRect(_ rect: CGRect?, imageSize: CGSize) -> CGRect? {
    guard let rect,
          imageSize.width > 0,
          imageSize.height > 0 else {
      return nil
    }

    let metadataRect = CGRect(
      x: rect.minX,
      y: 1 - rect.maxY,
      width: rect.width,
      height: rect.height
    )

    var layerRect: CGRect?
    let convertRect = {
      guard let previewLayer = self.previewLayer else {
        return
      }
      layerRect = previewLayer.layerRectConverted(fromMetadataOutputRect: metadataRect)
    }

    if Thread.isMainThread {
      convertRect()
    } else {
      DispatchQueue.main.sync(execute: convertRect)
    }

    guard let layerRect else {
      let viewBounds = currentViewBoundsSnapshot()
      guard viewBounds.width > 0, viewBounds.height > 0 else {
        return rect.clampedUnitRect()
      }
      return metadataRect.clampedUnitRect()
    }

    return layerRect.normalized(in: currentViewBoundsSnapshot())
  }

  private func updateRunningState() {
    guard didConfigureSession else {
      return
    }

    if isScanningEnabled {
      if !session.isRunning {
        sessionQueue.async { [weak self] in
          self?.log("starting capture session")
          self?.session.startRunning()
          self?.log("capture session started=\(self?.session.isRunning == true)")
        }
      }
      startGuidanceResetTimerIfNeeded()
    } else if session.isRunning {
      sessionQueue.async { [weak self] in
        self?.log("stopping capture session")
        self?.session.stopRunning()
      }
    }
  }

  private func startGuidanceResetTimerIfNeeded() {
    guard guidanceResetTimer == nil else {
      return
    }

    let timer = DispatchSource.makeTimerSource(queue: DispatchQueue.main)
    timer.schedule(deadline: .now() + 0.35, repeating: 0.35)
    timer.setEventHandler { [weak self] in
      self?.handleGuidanceTimeoutTick()
    }
    guidanceResetTimer = timer
    timer.resume()
  }

  private func handleGuidanceTimeoutTick() {
    guard isScanningEnabled, !hasEmittedScan else {
      return
    }

    let now = CACurrentMediaTime()
    if now - lastSignalTime > 0.9 {
      pendingBarcodeValue = nil
      pendingBarcodeCount = 0
      let shouldResetMrz = now - pendingMrzLastSeenTime > 1.6
      if shouldResetMrz {
        pendingMrzText = nil
        pendingMrzCount = 0
      }
      let preferredGuidance = now < readingGuidanceUntil ? "reading" : "searching"
      emitGuidance(preferredGuidance, candidateBox: nil)
      let bucket = Int(now)
      if bucket != lastLoggedNoSignalBucket {
        lastLoggedNoSignalBucket = bucket
        log("no metadata signal for >0.9s in mode \(scanMode)")
      }
    }
  }

  func metadataOutput(
    _ output: AVCaptureMetadataOutput,
    didOutput metadataObjects: [AVMetadataObject],
    from connection: AVCaptureConnection
  ) {
    guard scanMode.lowercased() == "pdf417", isScanningEnabled, !hasEmittedScan else {
      return
    }

    guard let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
          object.type == .pdf417,
          let transformedObject = previewLayer?.transformedMetadataObject(for: object) as? AVMetadataMachineReadableCodeObject else {
      if !metadataObjects.isEmpty {
        log("metadata callback had \(metadataObjects.count) objects but none matched PDF417")
      }
      return
    }

    lastSignalTime = CACurrentMediaTime()
    let guidance = feedbackForBarcode(bounds: transformedObject.bounds)
    log("barcode candidate type=\(object.type.rawValue) bounds=\(transformedObject.bounds) guidance=\(guidance) valueLength=\(object.stringValue?.count ?? 0)")
    // Where the code is in the view, sent with every sighting so the screen
    // can outline it while it is being lined up and read.
    emitGuidance(guidance, candidateBox: transformedObject.bounds.normalized(in: self.bounds))

    guard let value = object.stringValue, !value.isEmpty else {
      log("barcode candidate had empty stringValue")
      return
    }

    if pendingBarcodeValue == value {
      pendingBarcodeCount += 1
    } else {
      pendingBarcodeValue = value
      pendingBarcodeCount = 1
    }
    log("barcode stability count for current value: \(pendingBarcodeCount)")

    guard pendingBarcodeCount >= 2 else {
      return
    }

    if guidance == "detected" || guidance == "holdSteady" {
      emitGuidance("detected", candidateBox: transformedObject.bounds.normalized(in: self.bounds))
      hasEmittedScan = true
      log("barcode scan emitted successfully")
      onBarcodeScanned([
        "data": value,
        "type": "pdf417"
      ])
    }
  }

  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    guard scanMode.lowercased() == "mrz", isScanningEnabled, !hasEmittedScan else {
      return
    }

    let now = CACurrentMediaTime()
    guard now - lastMrzProcessingTime >= 0.22, !isProcessingMrzFrame else {
      return
    }

    lastMrzProcessingTime = now
    isProcessingMrzFrame = true

    defer {
      isProcessingMrzFrame = false
    }

    guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer),
          let mrzCrop = croppedMrzImage(from: pixelBuffer) else {
      DispatchQueue.main.async { [weak self] in
        self?.emitGuidance("searching", candidateBox: nil)
      }
      return
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    request.recognitionLanguages = ["en-US"]
    // Upright, the zone runs across the short side of the frame and its
    // characters are smaller: let smaller text through.
    request.minimumTextHeight = readingTurn == 0 ? 0.006 : 0.010
    log("mrz request configured minimumTextHeight=\(request.minimumTextHeight) cropRect=\(mrzCrop.normalizedFrameRect)")

    let handler = VNImageRequestHandler(cgImage: mrzCrop.cropImage, orientation: .up)

    do {
      try handler.perform([request])
      guard let observations = request.results else {
        if pendingDebugCapture {
          pendingDebugCapture = false
          lastHandledDebugCaptureToken = debugCaptureToken
          emitDebugCapture(mrzCrop, observations: [])
        }
        emitGuidance("searching", candidateBox: nil)
        return
      }

      if pendingDebugCapture {
        pendingDebugCapture = false
        lastHandledDebugCaptureToken = debugCaptureToken
        emitDebugCapture(mrzCrop, observations: observations)
      }

      if strictMrz {
        // Every frame, with or without text, so JavaScript also knows when
        // the zone has gone out of view.
        let payload: [String: Any] = [
          "lines": MrzTextDetector.rawLines(in: observations, cropRect: mrzCrop.normalizedFrameRect),
          "imageWidth": Double(mrzCrop.imageSize.width),
          "imageHeight": Double(mrzCrop.imageSize.height),
        ]
        DispatchQueue.main.async { [weak self] in
          self?.onMrzCandidates(payload)
        }
      }

      let analysis = analyzeMrzObservations(observations, imageSize: mrzCrop.imageSize, cropRect: mrzCrop.normalizedFrameRect)
      if analysis.hasSignal {
        lastSignalTime = CACurrentMediaTime()
        if let visionBox = analysis.visionBox,
           analysis.longestFragmentLength >= 20,
           (visionBox.height >= 0.12 || visionBox.width >= 0.16) {
          currentMrzCropRect = visionBox
        }
      } else if CACurrentMediaTime() - pendingMrzLastSeenTime > 1.1 {
        currentMrzCropRect = nil
      }
      logMrzAnalysis(analysis)

      if let detectedText = analysis.detectedText {
        pendingMrzLastSeenTime = CACurrentMediaTime()
        readingGuidanceUntil = pendingMrzLastSeenTime + 1.35
        lastStrongMrzTime = pendingMrzLastSeenTime

        let normalizedDetected = mrzStabilityKey(detectedText)
        let normalizedPending = pendingMrzText.map(mrzStabilityKey)
        let similarToPending = normalizedPending.map { normalizedMrzSimilarity($0, normalizedDetected) >= 0.96 } ?? false

        if let pending = pendingMrzText, pending == detectedText || similarToPending {
          pendingMrzCount += 1
          if pending != detectedText && similarToPending {
            pendingMrzText = preferredMrzText(existing: pending, incoming: detectedText)
          }
        } else {
          pendingMrzText = detectedText
          pendingMrzCount = 1
        }

        let passesEmitQuality =
          analysis.rowCount >= minimumMrzEmitRowCount &&
          analysis.longestRowLength >= minimumMrzEmitRowLength &&
          detectedText.count >= 88
        log(
          "mrz candidate parsed=true " +
          "text=\(summarizedMrzText(detectedText)) " +
          "pending=\(summarizedMrzText(pendingMrzText)) " +
          "stabilityKey=\(summarizedMrzText(normalizedDetected)) " +
          "stability=\(pendingMrzCount)/\(requiredStableMrzReads) " +
          "similar=\(similarToPending) " +
          "emitQuality=\(passesEmitQuality) " +
          "rows=\(analysis.rowCount) " +
          "longestRow=\(analysis.longestRowLength) " +
          "fragments=\(analysis.fragmentCount) " +
          "longestFragment=\(analysis.longestFragmentLength)"
        )

        // In strict reading the zone is only "detected" once JavaScript
        // says so; until then this view keeps reading.
        let hasStableMrz = pendingMrzCount >= requiredStableMrzReads && passesEmitQuality && !strictMrz
        let guidanceToEmit = hasStableMrz ? "detected" : "reading"
        DispatchQueue.main.async { [weak self] in
          self?.emitGuidance(guidanceToEmit, candidateBox: analysis.feedbackBox)
        }

        guard hasStableMrz else {
          if strictMrz {
            return
          }
          if pendingMrzCount < requiredStableMrzReads {
            log("mrz emit blocked reason=stability required=\(requiredStableMrzReads) current=\(pendingMrzCount)")
          }
          if !passesEmitQuality {
            log(
              "mrz emit blocked reason=quality " +
              "rowCount=\(analysis.rowCount)/\(minimumMrzEmitRowCount) " +
              "longestRow=\(analysis.longestRowLength)/\(minimumMrzEmitRowLength) " +
              "textLength=\(detectedText.count)/88"
            )
          }
          return
        }

        hasEmittedScan = true
        let emittedText = pendingMrzText ?? detectedText
        log("mrz scan emitted successfully textLength=\(emittedText.count)")
        DispatchQueue.main.async { [weak self] in
          self?.onMrzScanned([
            "text": emittedText,
            "type": "mrz"
          ])
        }
        return
      }

      if CACurrentMediaTime() - pendingMrzLastSeenTime <= 1.1 {
        log(
          "mrz holding reading guidance " +
          "pending=\(summarizedMrzText(pendingMrzText)) " +
          "stability=\(pendingMrzCount)/\(requiredStableMrzReads)"
        )
        DispatchQueue.main.async { [weak self] in
          self?.emitGuidance("reading", candidateBox: self?.currentCandidateBox)
        }
        return
      }

      if pendingMrzText != nil || pendingMrzCount != 0 {
        log("mrz pending candidate reset reason=stale stability=\(pendingMrzCount) text=\(summarizedMrzText(pendingMrzText))")
      }
      pendingMrzText = nil
      pendingMrzCount = 0

      let guidance = analysis.guidance ?? "searching"
      DispatchQueue.main.async { [weak self] in
        let feedbackBox = analysis.guidance == nil && analysis.feedbackBox == nil ? nil : analysis.feedbackBox
        self?.emitGuidance(guidance, candidateBox: feedbackBox)
      }
    } catch {
      print("ExpoDocumentReaderView failed to recognize MRZ text: \(error)")
    }
  }

  private func detectMrzText(in observations: [VNRecognizedTextObservation]) -> String? {
    return MrzTextDetector.detect(in: observations)
  }

  private func normalizeMrzForStability(_ text: String) -> String {
    text.uppercased()
      .replacingOccurrences(of: "\n", with: "")
      .replacingOccurrences(of: " ", with: "")
  }

  private func mrzStabilityKey(_ text: String) -> String {
    let lines = text
      .uppercased()
      .split(separator: "\n")
      .map { $0.replacingOccurrences(of: " ", with: "") }

    if lines.count == 2 {
      return String(lines[1])
    }

    if lines.count == 3 {
      return String(lines[1] + "|" + lines[2])
    }

    return normalizeMrzForStability(text)
  }

  private func normalizedMrzSimilarity(_ lhs: String, _ rhs: String) -> Double {
    guard !lhs.isEmpty, !rhs.isEmpty else {
      return 0
    }
    let maxCount = max(lhs.count, rhs.count)
    guard maxCount > 0 else {
      return 1
    }

    let prefixMatches = zip(lhs, rhs).filter { $0 == $1 }.count
    return Double(prefixMatches) / Double(maxCount)
  }

  private func mrzTextQualityScore(_ text: String) -> Int {
    let lines = text.uppercased().split(separator: "\n").map(String.init)
    guard let firstLine = lines.first else {
      return Int.min
    }

    let nameField = firstLine.count > 5 ? String(firstLine.dropFirst(5)) : ""
    let fillerCount = nameField.filter { $0 == "<" }.count
    let digitPenalty = firstLine.filter(\.isNumber).count * 6
    let ambiguousFillerPenalty = countAmbiguousFillerRuns(in: nameField) * 8
    let separatorBonus = nameField.contains("<<") ? 20 : 0
    let prefixBonus = firstLine.hasPrefix("P<") ? 30 : 0

    return prefixBonus + separatorBonus + min(fillerCount, 20) - digitPenalty - ambiguousFillerPenalty
  }

  private func countAmbiguousFillerRuns(in text: String) -> Int {
    let ambiguous = Set(["K", "C", "S", "E", "Z"])
    var runLength = 0
    var runCount = 0

    for character in text {
      if ambiguous.contains(String(character)) {
        runLength += 1
      } else {
        if runLength >= 2 {
          runCount += 1
        }
        runLength = 0
      }
    }

    if runLength >= 2 {
      runCount += 1
    }

    return runCount
  }

  private func preferredMrzText(existing: String, incoming: String) -> String {
    if mrzTextQualityScore(incoming) > mrzTextQualityScore(existing) {
      return incoming
    }
    return existing
  }

  private func summarizedMrzText(_ text: String?, maxLength: Int = 96) -> String {
    guard let text else {
      return "nil"
    }

    let singleLine = text.replacingOccurrences(of: "\n", with: "\\n")
    if singleLine.count <= maxLength {
      return singleLine
    }

    return String(singleLine.prefix(maxLength)) + "..."
  }

  private func emitGuidance(_ guidance: String, candidateBox: CGRect?) {
    if scanMode.lowercased() == "mrz", guidance != "detected", guidance != "reading", CACurrentMediaTime() < readingGuidanceUntil {
      let heldBox = candidateBox ?? currentCandidateBox
      if currentGuidance == "reading", boxesMatch(currentCandidateBox, heldBox) {
        return
      }
      log("guidance held at reading during MRZ stabilization window")
      currentGuidance = "reading"
      currentCandidateBox = heldBox
      onScanFeedback([
        "guidance": "reading",
        "type": "mrz",
        "candidateBox": serialize(rect: heldBox)
      ])
      return
    }

    let normalizedBox = candidateBox?.clampedUnitRect()
    if currentGuidance == guidance, boxesMatch(currentCandidateBox, normalizedBox) {
      return
    }
    log("guidance changed to \(guidance) in mode \(scanMode) candidateBox=\(String(describing: normalizedBox))")
    currentGuidance = guidance
    currentCandidateBox = normalizedBox
    onScanFeedback([
      "guidance": guidance,
      "type": scanMode.lowercased() == "mrz" ? "mrz" : "pdf417",
      "candidateBox": serialize(rect: normalizedBox)
    ])
  }



  private func boxesMatch(_ lhs: CGRect?, _ rhs: CGRect?) -> Bool {
    switch (lhs, rhs) {
    case (nil, nil):
      return true
    case let (.some(left), .some(right)):
      return left.approximatelyEquals(right)
    default:
      return false
    }
  }

  private func serialize(rect: CGRect?) -> [String: Double]? {
    guard let rect else { return nil }
    return [
      "x": Double(rect.origin.x),
      "y": Double(rect.origin.y),
      "width": Double(rect.size.width),
      "height": Double(rect.size.height)
    ]
  }

  private func feedbackForBarcode(bounds: CGRect) -> String {
    guard !self.bounds.isEmpty else {
      return "holdSteady"
    }

    let widthRatio = bounds.width / self.bounds.width
    let heightRatio = bounds.height / self.bounds.height
    let midXRatio = bounds.midX / self.bounds.width
    let midYRatio = bounds.midY / self.bounds.height

    if widthRatio < 0.18 || heightRatio < 0.035 {
      return "moveCloser"
    }

    if widthRatio > 0.96 || heightRatio > 0.50 {
      return "moveFarther"
    }

    if midXRatio < 0.22 {
      return "moveRight"
    }

    if midXRatio > 0.78 {
      return "moveLeft"
    }

    if midYRatio < 0.22 {
      return "moveDown"
    }

    if midYRatio > 0.78 {
      return "moveUp"
    }

    if widthRatio < 0.34 {
      return "holdSteady"
    }

    return "detected"
  }

  private func mapVisionRect(_ rect: CGRect?, fromCropRect cropRect: CGRect) -> CGRect? {
    guard let rect else {
      return nil
    }

    return CGRect(
      x: cropRect.minX + (rect.minX * cropRect.width),
      y: cropRect.minY + (rect.minY * cropRect.height),
      width: rect.width * cropRect.width,
      height: rect.height * cropRect.height
    ).clampedUnitRect()
  }

  private func analyzeMrzObservations(_ observations: [VNRecognizedTextObservation], imageSize: CGSize, cropRect: CGRect) -> MrzAnalysis {
    let detection = MrzTextDetector.analyze(in: observations)
    let mappedVisionBox = mapVisionRect(detection.guidanceBox ?? detection.combinedBox, fromCropRect: cropRect)
    let feedbackBox = mapVisionRectToViewRect(mappedVisionBox, imageSize: imageSize)

    guard detection.hasSignal else {
      return MrzAnalysis(
        hasSignal: false,
        fragmentCount: 0,
        rowCount: 0,
        combinedBox: nil,
        feedbackBox: nil,
        visionBox: nil,
        guidance: nil,
        detectedText: nil,
        longestFragmentLength: 0,
        longestRowLength: 0,
        rowLengthsDescription: "[]"
      )
    }

    let guidance: String?
    if detection.detectedText != nil {
      guidance = "reading"
    } else if let feedbackBox {
      guidance = feedbackForMrz(
        combinedBox: feedbackBox,
        rowCount: detection.rows.count,
        longestRowLength: detection.longestRowLength,
        fragmentCount: detection.fragments.count,
        longestFragmentLength: detection.longestFragmentLength
      )
    } else {
      guidance = nil
    }

    return MrzAnalysis(
      hasSignal: true,
      fragmentCount: detection.fragments.count,
      rowCount: detection.rows.count,
      combinedBox: feedbackBox,
      feedbackBox: feedbackBox,
      visionBox: mappedVisionBox,
      guidance: guidance,
      detectedText: detection.detectedText,
      longestFragmentLength: detection.longestFragmentLength,
      longestRowLength: detection.longestRowLength,
      rowLengthsDescription: detection.rowLengthsDescription
    )
  }

  private func logMrzAnalysis(_ analysis: MrzAnalysis) {
    if !analysis.hasSignal {
      log("mrz frame observations=0 fragments=0 rows=0 guidance=searching")
      return
    }

    let boxText: String
    if let box = analysis.combinedBox {
      boxText = NSCoder.string(for: box)
    } else {
      boxText = "nil"
    }

    ExpoModulesCore.log("mrz frame fragments=\(analysis.fragmentCount) rows=\(analysis.rowCount) longestFragmentLength=\(analysis.longestFragmentLength) longestRowLength=\(analysis.longestRowLength) rowLengths=\(analysis.rowLengthsDescription) combinedBox=\(boxText) guidance=\(analysis.guidance ?? "nil") parsed=\(analysis.detectedText != nil)")
  }

  private func feedbackForMrz(combinedBox: CGRect, rowCount: Int, longestRowLength: Int, fragmentCount: Int, longestFragmentLength: Int) -> String {
    let width = combinedBox.width
    let height = combinedBox.height
    let area = width * height
    let centerX = combinedBox.midX
    let centerY = combinedBox.midY
    let now = CACurrentMediaTime()

    let hasStrongRows = rowCount >= 2 && longestRowLength >= 36
    let hasModerateRows = rowCount >= 2 && longestRowLength >= 30
    let hasFragmentSignal = fragmentCount >= 2 && longestFragmentLength >= 12

    guard hasModerateRows || hasFragmentSignal || now - lastStrongMrzTime < 1.0 else {
      return "searching"
    }

    if centerX < 0.22 {
      return "moveRight"
    }
    if centerX > 0.78 {
      return "moveLeft"
    }
    if centerY > 0.62 {
      return "moveDown"
    }
    if centerY < 0.16 {
      return "moveUp"
    }
    if height < 0.30 || area < 0.07 {
      return "moveCloser"
    }
    if height > 0.72 || area > 0.24 {
      return "moveFarther"
    }

    if hasStrongRows {
      return "reading"
    }

    return "holdSteady"
  }
}

private struct MrzAnalysis {
  let hasSignal: Bool
  let fragmentCount: Int
  let rowCount: Int
  let combinedBox: CGRect?
  let feedbackBox: CGRect?
  let visionBox: CGRect?
  let guidance: String?
  let detectedText: String?
  let longestFragmentLength: Int
  let longestRowLength: Int
  let rowLengthsDescription: String
}
private extension CGRect {
  var isFinite: Bool {
    origin.x.isFinite && origin.y.isFinite && size.width.isFinite && size.height.isFinite
  }

  func clampedUnitRect() -> CGRect {
    let x = min(max(origin.x, 0), 1)
    let y = min(max(origin.y, 0), 1)
    let width = min(max(size.width, 0), 1 - x)
    let height = min(max(size.height, 0), 1 - y)
    return CGRect(x: x, y: y, width: width, height: height)
  }

  func normalized(in bounds: CGRect) -> CGRect {
    guard bounds.width > 0, bounds.height > 0 else { return .zero }
    return CGRect(
      x: origin.x / bounds.width,
      y: origin.y / bounds.height,
      width: size.width / bounds.width,
      height: size.height / bounds.height
    ).clampedUnitRect()
  }

  func approximatelyEquals(_ other: CGRect?, epsilon: CGFloat = 0.02) -> Bool {
    guard let other else { return false }
    return abs(origin.x - other.origin.x) <= epsilon &&
      abs(origin.y - other.origin.y) <= epsilon &&
      abs(size.width - other.size.width) <= epsilon &&
      abs(size.height - other.size.height) <= epsilon
  }
}
