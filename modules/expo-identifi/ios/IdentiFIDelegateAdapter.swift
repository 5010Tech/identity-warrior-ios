import UIKit

@objcMembers
public class IdentiFIDelegateAdapter: NSObject, IdentiFI_Delegate {
  public weak var module: ExpoIdentifiModule?

  public func onConnection() {
    module?.handleConnection()
  }

  public func onConnectionError(_ errorDescription: String) {
    module?.handleConnectionError(errorDescription)
  }

  public func onConnectionTimeOut() {
    module?.handleConnectionTimeOut()
  }

  public func onDisconnection() {
    module?.handleDisconnection()
  }

  public func onCancelFpCapture() {
    module?.handleCancelFpCapture()
  }

  public func onFpCaptureStatus(_ fpCaptureStatus: Int32) {
    module?.handleCaptureStatus(fpCaptureStatus)
  }

  public func onStreaming(_ fpImage: UIImage!) {
    guard let fpImage else { return }
    module?.handleStreaming(fpImage)
  }

  public func onStreamingRolledFp(_ fpImage: UIImage!, rollingState currentState: Int32, verticalLineX currentXPosition: Int32) {
    guard let fpImage else { return }
    module?.handleStreamingRolledFp(fpImage, rollingState: currentState, verticalLineX: currentXPosition)
  }

  public func onLastFrame(_ fpImage: UIImage!, fpImageSavedAt savedAtIndex: Int32) {
    guard let fpImage else { return }
    module?.handleLastFrame(fpImage, savedAtIndex: savedAtIndex)
  }

  public func onLastFrame_RAW(_ rawFpImageData: Data!, fpImageSavedAt savedAtIndex: Int32) {
    guard let rawFpImageData else { return }
    module?.handleLastFrame_RAW(rawFpImageData, savedAtIndex: savedAtIndex)
  }

  public func onLastFrameRolledFp(_ fpImage: UIImage!, fpImageSavedAt savedAtIndex: Int32) {
    guard let fpImage else { return }
    module?.handleLastFrame(fpImage, savedAtIndex: savedAtIndex)
  }

  public func onLastFrameRolledFp_RAW(_ rawFpImageData: Data!, fpImageSavedAt savedAtIndex: Int32) {
    guard let rawFpImageData else { return }
    module?.handleLastFrame_RAW(rawFpImageData, savedAtIndex: savedAtIndex)
  }

  public func onCancelIrisCapture() {
    module?.handleCancelIrisCapture()
  }

  public func onIrisCaptureStatus(_ irisCaptureStatus: Int32) {
    NSLog("Iris capture status: \(irisCaptureStatus)")
    module?.handleIrisCaptureStatus(irisCaptureStatus)
  }

  public func onStreamingLeftIris(_ leftIrisImage: UIImage!, rightIris rightIrisImage: UIImage!) {
    guard let leftIrisImage, let rightIrisImage else { return }
    module?.handleStreamingLeftIris(leftIrisImage, rightIris: rightIrisImage)
  }

  public func onLastFrameLeftIris(
    _ leftIrisImage: UIImage!,
    rightIris rightIrisImage: UIImage!,
    leftIrisTotalScore leftTotalScore: Int32,
    leftIrisUsableArea leftUsabeArea: Int32,
    rightIrisTotalScore rightTotalScore: Int32,
    rightIrisUsableArea rightUsabeArea: Int32
  ) {
    guard let leftIrisImage, let rightIrisImage else { return }
    module?.handleLastFrameLeftIris(
      leftIrisImage,
      rightIris: rightIrisImage,
      leftIrisTotalScore: leftTotalScore,
      leftIrisUsableArea: leftUsabeArea,
      rightIrisTotalScore: rightTotalScore,
      rightIrisUsableArea: rightUsabeArea
    )
  }

  public func onGetLEDBrightness(_ ledBrightness: Int32) {}

  public func onSetLEDBrightness(_ ledBrightness: Int32) {}

  public func onSetMinimumNFIQScore(_ minimumNFIQScore: Int32) {
    module?.handleSetMinimumNFIQScore(minimumNFIQScore)
  }

  public func onGetNfiqScore(_ nfiqScore: Int32, fromImageSavedAt savedAtIndex: Int32) {
    module?.handleGetNfiqScore(nfiqScore, savedAtIndex: savedAtIndex)
  }

  public func onGetSegmentedFpImage_RAW(_ rawFpImageData: Data!, fromImageSavedAt savedAtIndex: Int32) {
    guard let rawData = rawFpImageData else {
      return
    }

    let width = 800
    let height = 750
    let bitsPerComponent = 8
    let bytesPerRow = width
    let colorSpace = CGColorSpaceCreateDeviceGray()

    guard let providerRef = CGDataProvider(data: rawData as CFData) else {
      return
    }

    guard let cgImage = CGImage(
      width: width,
      height: height,
      bitsPerComponent: bitsPerComponent,
      bitsPerPixel: bitsPerComponent,
      bytesPerRow: bytesPerRow,
      space: colorSpace,
      bitmapInfo: CGBitmapInfo(rawValue: 0),
      provider: providerRef,
      decode: nil,
      shouldInterpolate: false,
      intent: .defaultIntent
    ) else {
      return
    }

    let uiImage = UIImage(cgImage: cgImage, scale: 1.0, orientation: .downMirrored)
    module?.handleGetSegmentedFpImage(uiImage)
  }

  public func onGetWSQEncodedFpImage(_ wsqEncodedFpImageData: Data!, fromImageSavedAt savedAtIndex: Int32) {
    guard let wsqEncodedFpImageData else { return }
    module?.handleGetWSQEncodedFpImage(wsqEncodedFpImageData, savedAtIndex: savedAtIndex)
  }

  public func onIsFingerDuplicated(_ isFingerDuplicated: Int32) {}

  public func onSavedFpImagesCleared(_ savedAtIndex: Int32) {
    module?.handleSavedFpImagesCleared(savedAtIndex)
  }

  public func onGetPowerOffMode(_ secondsToPowerOff: Int32) {}

  public func onSetPowerOffMode(_ secondsToPowerOff: Int32) {}

  public func onGetFpPowerStatus(_ irisPowerStatus: Bool) {}

  public func onSetFpPower(on irisPowerStatus: Bool) {}

  public func onSetFpPowerOff() {}

  public func onGetIrisPowerStatus(_ irisPowerStatus: Bool) {
    module?.handleGetIrisPowerStatus(irisPowerStatus)
  }

  public func onSetIrisPower(on irisPowerStatus: Bool) {
    module?.handleSetIrisPowerOn(irisPowerStatus)
  }

  public func onSetIrisPowerOff() {
    module?.handleSetIrisPowerOff()
  }

  public func onGetBatteryPercentage(_ percentLevel: Int32) {
    module?.handleGetBatteryPercentage(percentLevel)
  }

  public func onGetDeviceSerialNumber(_ serialNumber: String!) {
    guard let serialNumber else { return }
    module?.handleGetDeviceSerialNumber(serialNumber)
  }

  public func onGetFirmwareVersion(_ version: String!) {}

  public func onGetModelNumber(_ model: String!) {
    guard let model else { return }
    module?.handleGetModelNumber(model)
  }

  public func onGetReaderDescription(_ deviceDescription: String!) {}

  public func onSetLEDControl(forPowerLED power: Int32, fpLED fp: Int32, comLED com: Int32, irisLED iris: Int32, mSecOn mOn: Int32, mSecOff mOff: Int32) {}

  public func onFirmwareTransferCompleted(_ transferResult: Int) {}
}
