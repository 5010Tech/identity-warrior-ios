import ExpoModulesCore

public class ExpoDocumentReaderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoDocumentReader")

    View(ExpoDocumentReaderView.self) {
      Prop("scanMode") { (view: ExpoDocumentReaderView, scanMode: String?) in
        view.scanMode = scanMode ?? "pdf417"
      }

      Prop("isScanningEnabled") { (view: ExpoDocumentReaderView, isScanningEnabled: Bool?) in
        view.isScanningEnabled = isScanningEnabled ?? true
      }

      Prop("debugCaptureToken") { (view: ExpoDocumentReaderView, debugCaptureToken: Int?) in
        view.debugCaptureToken = debugCaptureToken ?? 0
      }

      Events("onBarcodeScanned", "onMrzScanned", "onScanFeedback", "onDebugCapture")
    }
  }
}
