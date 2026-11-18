package expo.modules.identifi

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoIdentifiModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoIdentifi")

    Constants("PI" to Math.PI)
    Events("onChange")

    Function("hello") {
      "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { value: String ->
      sendEvent("onChange", mapOf("value" to value))
    }

    View(ExpoIdentifiView::class) {
      Prop("name") { _: ExpoIdentifiView, _: String -> }
      Prop("streamType") { _: ExpoIdentifiView, _: String? -> }
    }
  }
}
