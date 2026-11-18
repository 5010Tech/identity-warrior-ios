package expo.modules.documentreader

import android.content.Context
import android.view.View
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

class ExpoDocumentReaderView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  var scanMode: String = "pdf417"
  var isScanningEnabled: Boolean = true

  init {
    setBackgroundColor(android.graphics.Color.BLACK)
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    addView(View(context).apply {
      layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
      setBackgroundColor(android.graphics.Color.BLACK)
    })
  }
}
