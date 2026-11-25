import CoreBluetooth
import ExpoModulesCore
import Foundation
import GrabbaWirelessSDK
import ImageIO
import UIKit

/// A Grabba A-Series device, reached over Bluetooth LE: finding it,
/// connecting to it and scanning fingerprints with it.
public class ExpoGrabbaModule: Module {
  private let adapter = GrabbaDelegateAdapter()
  private var prepared = false

  // Devices seen in the search in hand, by serial number.
  private var found: [Int: GrabbaDevice] = [:]
  private var searchStartedAt: Date?
  // Searches started since anything was last found or connected: only the
  // first few are logged, so a phone with no Grabba nearby does not fill
  // the log.
  private var emptySearches = 0

  private var pendingConnect: Promise?
  private var connectTimer: Timer?

  private var fingerprintReady = false
  private var asleep = false

  // The fingerprint scan in hand.
  private var pendingScan: Promise?
  // Asked for while the device slept: sent when it is ready again.
  private var queuedScan: FingerprintInfo.ScanType?
  private var scanCompression = FingerprintInfo.CompressionType.None
  private var scanTimer: Timer?
  private var scanStartedAt: Date?
  private var previews = 0
  private var firstPreview: [String: Any]?
  private var finalImage: [String: Any]?
  private var segments: Data?

  private var sdk: GrabbaWireless { GrabbaWireless.shared }

  public func definition() -> ModuleDefinition {
    Name("ExpoGrabba")

    Events("onGrabbaFound", "onGrabbaConnection", "onGrabbaFingerprint", "onGrabbaDebug")

    AsyncFunction("sdkVersion") { () -> String in
      self.prepare()
      return self.sdk.getSoftwareVersion()
    }.runOnQueue(.main)

    // Starts looking for devices. False when already looking or connected.
    AsyncFunction("startDiscovery") { () -> Bool in
      self.prepare()
      if self.sdk.isConnected() || self.pendingConnect != nil {
        return false
      }
      if self.sdk.isScanning() {
        // A search that has found nothing for a while is started afresh: one
        // asked for before Bluetooth was ready may never have begun.
        let age = Date().timeIntervalSince(self.searchStartedAt ?? Date.distantPast)
        if !self.found.isEmpty || age < 12 {
          return false
        }
        self.sdk.stopScanning()
      }
      self.found.removeAll()
      self.searchStartedAt = Date()
      self.emptySearches += 1
      if self.emptySearches <= 4 {
        self.debug("search \(self.emptySearches) started, Bluetooth permission \(self.bluetoothPermission())")
      }
      self.sdk.scanForGrabbas()
      return true
    }.runOnQueue(.main)

    AsyncFunction("stopDiscovery") { () -> Void in
      if !self.prepared { return }
      if self.sdk.isScanning() {
        self.sdk.stopScanning()
      }
    }.runOnQueue(.main)

    AsyncFunction("connect") { (serial: Int, promise: Promise) in
      self.prepare()
      guard let device = self.found[serial] else {
        promise.reject("ERR_GRABBA_NOT_FOUND", "That device has not been seen in this search")
        return
      }
      if self.pendingConnect != nil {
        promise.reject("ERR_GRABBA_BUSY", "A connection is already being made")
        return
      }
      self.pendingConnect = promise
      if self.sdk.isScanning() {
        self.sdk.stopScanning()
      }
      self.connectTimer = Timer.scheduledTimer(withTimeInterval: 20, repeats: false) { [weak self] _ in
        self?.finishConnect(code: "ERR_GRABBA_CONNECT_TIMEOUT", message: "The device did not answer in time")
      }
      self.debug("connecting to \(serial)")
      self.sdk.connectToGrabbaDevice(device)
    }.runOnQueue(.main)

    AsyncFunction("disconnect") { () -> Void in
      if !self.prepared { return }
      if self.sdk.isConnected() {
        self.sdk.disconnectFromGrabbaDevice()
      }
    }.runOnQueue(.main)

    // The connected device ("connected" false when there is none).
    AsyncFunction("getConnected") { () -> [String: Any] in
      if !self.prepared { return ["connected": false] }
      guard self.sdk.isConnected(), let device = self.sdk.connectedDevice else {
        return ["connected": false]
      }
      var body = self.describe(device)
      body["connected"] = true
      return body
    }.runOnQueue(.main)

    AsyncFunction("wake") { () -> Void in
      if !self.prepared { return }
      if self.sdk.isConnected() {
        self.sdk.wakeUpConnectedGrabbaDevice()
      }
    }.runOnQueue(.main)

    // One fingerprint scan. scanType: 0 roll, 1 to 4 that many fingers flat.
    // Resolves with what the device sent: the image (as a PNG when it can be
    // read as a picture), what kind of image it is, and the finger boxes.
    AsyncFunction("scanFingerprint") { (scanType: Int, wsq: Bool, promise: Promise) in
      self.prepare()
      guard self.sdk.isConnected() else {
        promise.reject("ERR_GRABBA_NOT_CONNECTED", "No Grabba is connected")
        return
      }
      guard let type = self.scanType(scanType) else {
        promise.reject("ERR_GRABBA_SCAN_TYPE", "Unknown scan type \(scanType)")
        return
      }
      // Asleep, the scanner is woken first and the scan sent once it says it
      // is ready again.
      guard self.fingerprintReady || self.asleep else {
        promise.reject("ERR_GRABBA_NOT_READY", "The fingerprint scanner is not ready yet")
        return
      }
      if self.pendingScan != nil {
        promise.reject("ERR_GRABBA_BUSY", "A scan is already under way")
        return
      }
      self.pendingScan = promise
      self.scanCompression = wsq ? FingerprintInfo.CompressionType.WSQ : FingerprintInfo.CompressionType.None
      self.scanStartedAt = Date()
      self.previews = 0
      self.firstPreview = nil
      self.finalImage = nil
      self.segments = nil
      // Long: an uncompressed four-finger image is large for Bluetooth LE.
      self.scanTimer = Timer.scheduledTimer(withTimeInterval: 180, repeats: false) { [weak self] _ in
        guard let self = self, self.pendingScan != nil else { return }
        self.sdk.stopFingerprintScanning()
        self.finishScan(code: "ERR_GRABBA_SCAN_TIMEOUT", message: "No fingerprint arrived in time")
      }
      if self.fingerprintReady {
        self.debug("fingerprint scan requested, type \(scanType), \(wsq ? "WSQ" : "picture")")
        self.sdk.scanFingerprint(scanType: type, compressionType: self.scanCompression)
      } else {
        self.debug("fingerprint scan requested, type \(scanType): waking the device first")
        self.queuedScan = type
        self.sdk.wakeUpConnectedGrabbaDevice()
      }
    }.runOnQueue(.main)

    AsyncFunction("stopFingerprint") { () -> Void in
      if !self.prepared { return }
      if self.sdk.isConnected() {
        self.sdk.stopFingerprintScanning()
      }
      self.finishScan(code: "ERR_GRABBA_CANCELLED", message: "The scan was stopped")
    }.runOnQueue(.main)
  }

  // The SDK is first touched here, not when the app starts: that is when iOS
  // asks for permission to use Bluetooth.
  private func prepare() {
    if prepared { return }
    prepared = true
    adapter.module = self
    adapter.startLogging()
    sdk.delegate = adapter
  }

  // The SDK's own names for what to scan (its numbers for them are its own
  // business: asking by number was refused).
  private func scanType(_ value: Int) -> FingerprintInfo.ScanType? {
    switch value {
    case 0: return FingerprintInfo.ScanType.FingerRoll
    case 1: return FingerprintInfo.ScanType.OneFinger
    case 2: return FingerprintInfo.ScanType.TwoFingers
    case 3: return FingerprintInfo.ScanType.ThreeFingers
    case 4: return FingerprintInfo.ScanType.FourFingers
    default: return nil
    }
  }

  private func bluetoothPermission() -> String {
    switch CBCentralManager.authorization {
    case .allowedAlways: return "allowed"
    case .denied: return "denied"
    case .restricted: return "restricted"
    case .notDetermined: return "not asked yet"
    @unknown default: return "unknown"
    }
  }

  func debug(_ message: String) {
    sendEvent("onGrabbaDebug", ["message": message])
  }

  private func describe(_ device: GrabbaDevice) -> [String: Any] {
    return [
      "serial": device.serialNumber,
      "model": device.modelNumber ?? "",
      "firmware": device.firmwareRevision ?? "",
      "hardware": device.hardwareRevision ?? "",
      "software": device.softwareRevision ?? "",
      "manufacturer": device.manufacturerName ?? "",
      "ready": device.isReady(),
      "fingerprintReady": fingerprintReady,
      "asleep": asleep
    ]
  }

  private func errorText(_ error: Error) -> String {
    let nsError = error as NSError
    return "\(nsError.domain) \(nsError.code): \(nsError.localizedDescription)"
  }

  private func sendConnection() {
    guard sdk.isConnected(), let device = sdk.connectedDevice else {
      sendEvent("onGrabbaConnection", ["connected": false])
      return
    }
    var body = describe(device)
    body["connected"] = true
    sendEvent("onGrabbaConnection", body)
  }

  // MARK: Finding and connecting

  func handleFound(_ device: GrabbaDevice) {
    emptySearches = 0
    let isNew = found[device.serialNumber] == nil
    found[device.serialNumber] = device
    if isNew {
      debug("found \(device.serialNumber)")
    }
    sendEvent("onGrabbaFound", ["serial": device.serialNumber, "model": device.modelNumber ?? ""])
  }

  func handleConnected(_ device: GrabbaDevice) {
    asleep = false
    debug("connected to \(device.serialNumber)")
    connectTimer?.invalidate()
    connectTimer = nil
    let promise = pendingConnect
    pendingConnect = nil
    promise?.resolve(describe(device))
    sendConnection()
  }

  func handleConnectFailed(_ error: Error) {
    debug("connection failed: \(errorText(error))")
    finishConnect(code: "ERR_GRABBA_CONNECT_FAILED", message: errorText(error))
  }

  private func finishConnect(code: String, message: String) {
    connectTimer?.invalidate()
    connectTimer = nil
    guard let promise = pendingConnect else { return }
    pendingConnect = nil
    promise.reject(code, message)
  }

  func handleDisconnected(_ device: GrabbaDevice) {
    debug("disconnected from \(device.serialNumber)")
    fingerprintReady = false
    asleep = false
    finishConnect(code: "ERR_GRABBA_CONNECT_FAILED", message: "The device disconnected")
    finishScan(code: "ERR_GRABBA_NOT_CONNECTED", message: "The device disconnected")
    sendEvent("onGrabbaConnection", ["connected": false, "serial": device.serialNumber])
  }

  func handleRaisedError(_ error: NSError) {
    debug("error raised: \(errorText(error))")
    // An error with a scan under way ends the scan: the device will not send
    // its image after one.
    finishScan(code: "ERR_GRABBA_SCAN_FAILED", message: errorText(error))
  }

  func handlePower(asleep: Bool) {
    self.asleep = asleep
    if asleep {
      // Its scanner says when it is ready again after waking.
      fingerprintReady = false
    }
    debug(asleep ? "device went to sleep" : "device woke up")
    sendConnection()
  }

  // MARK: Fingerprint

  func handleFingerprintReady() {
    fingerprintReady = true
    asleep = false
    debug("fingerprint scanner ready")
    sendConnection()
    if let type = queuedScan, pendingScan != nil {
      queuedScan = nil
      debug("sending the scan that waited for the device to wake")
      sdk.scanFingerprint(scanType: type, compressionType: scanCompression)
    }
  }

  func handleFingerprintStarted() {
    debug("fingerprint scan started")
    sendEvent("onGrabbaFingerprint", ["state": "started"])
  }

  func handleFingerprint(_ image: Data, isFinal: Bool, nistScore: Int, compressionType: Int) {
    if !isFinal {
      previews += 1
      if firstPreview == nil {
        let facts = analyse(image, withPicture: false)
        firstPreview = facts
        debug("first preview image: \(image.count) bytes, starts \(facts["magic"] ?? "?"), \(facts["width"] ?? "?")x\(facts["height"] ?? "?")")
      } else if previews % 10 == 0 {
        debug("\(previews) preview images so far")
      }
      sendEvent("onGrabbaFingerprint", ["state": "preview", "count": previews, "bytes": image.count])
      return
    }
    var result = analyse(image, withPicture: true)
    result["nistScore"] = nistScore
    result["compressionType"] = compressionType
    finalImage = result
    debug("final image received, \(image.count) bytes")
    sendEvent("onGrabbaFingerprint", ["state": "final", "bytes": image.count])
    if segments != nil {
      finishScan(code: nil, message: nil)
    } else {
      // The finger boxes may come just after the image: give them a moment.
      DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
        self?.finishScan(code: nil, message: nil)
      }
    }
  }

  func handleSegments(_ data: Data) {
    segments = data
    debug("finger boxes received, \(data.count) bytes")
    if finalImage != nil {
      finishScan(code: nil, message: nil)
    }
  }

  func handleFingerprintFailed(_ error: Error) {
    debug("fingerprint scan failed: \(errorText(error))")
    finishScan(code: "ERR_GRABBA_SCAN_FAILED", message: errorText(error))
  }

  private func finishScan(code: String?, message: String?) {
    guard let promise = pendingScan else { return }
    queuedScan = nil
    if let code = code {
      scanTimer?.invalidate()
      scanTimer = nil
      pendingScan = nil
      promise.reject(code, message ?? "")
      return
    }
    guard var result = finalImage else { return }
    scanTimer?.invalidate()
    scanTimer = nil
    pendingScan = nil
    result["previews"] = previews
    if let firstPreview = firstPreview {
      result["firstPreview"] = firstPreview
    }
    if let segments = segments {
      result["segmentBytes"] = segments.count
      result["segmentHex"] = segments.prefix(160).map { String(format: "%02x", $0) }.joined()
    }
    if let startedAt = scanStartedAt {
      result["milliseconds"] = Int(Date().timeIntervalSince(startedAt) * 1000)
    }
    promise.resolve(result)
  }

  /// What kind of image the device sent: its size in bytes, how it starts,
  /// and, when iOS can read it as a picture, its dimensions and resolution.
  private func analyse(_ data: Data, withPicture: Bool) -> [String: Any] {
    var info: [String: Any] = [
      "bytes": data.count,
      "magic": data.prefix(8).map { String(format: "%02x", $0) }.joined()
    ]
    if let source = CGImageSourceCreateWithData(data as CFData, nil) {
      if let type = CGImageSourceGetType(source) {
        info["type"] = type as String
      }
      if let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [String: Any] {
        if let dpi = properties[kCGImagePropertyDPIWidth as String] as? NSNumber {
          info["dpiX"] = dpi.doubleValue
        }
        if let dpi = properties[kCGImagePropertyDPIHeight as String] as? NSNumber {
          info["dpiY"] = dpi.doubleValue
        }
      }
    }
    // A BMP says its resolution in pixels per metre, at byte 38.
    if data.count >= 46, data[data.startIndex] == 0x42, data[data.startIndex + 1] == 0x4D {
      let at = data.startIndex + 38
      let perMetre = Int(data[at]) | Int(data[at + 1]) << 8 | Int(data[at + 2]) << 16 | Int(data[at + 3]) << 24
      info["bmpPixelsPerMetre"] = perMetre
    }
    // A WSQ file says its size in its frame header (marker FF A2): two bytes
    // of length, black and white, then height and width.
    let bytes = [UInt8](data.prefix(4096))
    if bytes.count > 12, bytes[0] == 0xFF, bytes[1] == 0xA0 {
      info["type"] = "wsq"
      var at = 2
      while at + 9 < bytes.count {
        if bytes[at] == 0xFF, bytes[at + 1] == 0xA2 {
          info["height"] = Int(bytes[at + 6]) << 8 | Int(bytes[at + 7])
          info["width"] = Int(bytes[at + 8]) << 8 | Int(bytes[at + 9])
          break
        }
        at += 1
      }
    } else if let image = UIImage(data: data), let cgImage = image.cgImage {
      info["width"] = cgImage.width
      info["height"] = cgImage.height
      info["bitsPerPixel"] = cgImage.bitsPerPixel
      if withPicture, let png = image.pngData() {
        info["png"] = png.base64EncodedString()
      }
    }
    return info
  }
}
