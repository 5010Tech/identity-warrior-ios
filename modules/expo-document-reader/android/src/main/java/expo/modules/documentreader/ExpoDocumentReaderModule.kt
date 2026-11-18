package expo.modules.documentreader

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoDocumentReaderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoDocumentReader")

    View(ExpoDocumentReaderView::class) {
      Prop("scanMode") { view: ExpoDocumentReaderView, scanMode: String? ->
        view.scanMode = scanMode ?: "pdf417"
      }

      Prop("isScanningEnabled") { view: ExpoDocumentReaderView, isScanningEnabled: Boolean? ->
        view.isScanningEnabled = isScanningEnabled ?: true
      }

      Events("onBarcodeScanned", "onMrzScanned", "onScanFeedback")
    }
  }
}
