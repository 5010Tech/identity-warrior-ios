import Foundation
import GrabbaWirelessSDK

/// Hears from the Grabba SDK and hands each call to the module on the main
/// queue. Also passes the SDK's own log lines on, for the field log.
final class GrabbaDelegateAdapter: NSObject, GrabbaWirelessDelegate, LoggerProtocol {
  weak var module: ExpoGrabbaModule?
  private var logging = false

  private func onMain(_ block: @escaping (ExpoGrabbaModule) -> Void) {
    DispatchQueue.main.async { [weak self] in
      if let module = self?.module {
        block(module)
      }
    }
  }

  func startLogging() {
    if logging { return }
    logging = true
    Log.shared.logLevel = .info
    Log.shared.addLogger(self)
  }

  // MARK: LoggerProtocol

  func log(message: String, level: LogLevel) {
    if level == .debug || level == .off { return }
    let label = level.toString()
    onMain { $0.debug("sdk \(label): \(message)") }
  }

  // MARK: Finding and connecting

  func grabbaWirelessDidDiscoverGrabbaDevice(_ grabbaDevice: GrabbaDevice) {
    onMain { $0.handleFound(grabbaDevice) }
  }

  func grabbaWirelessDidConnect(to grabbaDevice: GrabbaDevice) {
    onMain { $0.handleConnected(grabbaDevice) }
  }

  func grabbaWirelessDidFailToConnect(to grabbaDevice: GrabbaDevice, error: Error) {
    onMain { $0.handleConnectFailed(error) }
  }

  func grabbaWirelessDidDisconnect(from grabbaDevice: GrabbaDevice) {
    onMain { $0.handleDisconnected(grabbaDevice) }
  }

  func grabbaWirelessDidRaiseError(_ error: NSError) {
    onMain { $0.handleRaisedError(error) }
  }

  func connectedGrabbaDidSleep(_ grabbaDevice: GrabbaDevice) {
    onMain { $0.handlePower(asleep: true) }
  }

  func connectedGrabbaDidWake(_ grabbaDevice: GrabbaDevice) {
    onMain { $0.handlePower(asleep: false) }
  }

  // MARK: Fingerprint

  func connectedGrabbaFingerprintScanningIsReady() {
    onMain { $0.handleFingerprintReady() }
  }

  func connectedGrabbaFingerprintScanStart() {
    onMain { $0.handleFingerprintStarted() }
  }

  func connectedGrabbaDidScanFingerprint(_ image: Data, _ isFinal: Bool, _ nistScore: Int, _ compressionType: Int) {
    onMain { $0.handleFingerprint(image, isFinal: isFinal, nistScore: nistScore, compressionType: compressionType) }
  }

  func connectedGrabbaDidSendFingerprintSegments(_ segmentsData: Data) {
    onMain { $0.handleSegments(segmentsData) }
  }

  func connectedGrabbaFingerprintScanFailedWithError(_ error: Error) {
    onMain { $0.handleFingerprintFailed(error) }
  }
}
