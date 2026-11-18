import Expo
import React
import ReactAppDependencyProvider

// Apps built with the iOS 27 SDK must use the UIScene life cycle. Expo SDK 54's
// generated AppDelegate creates its window in didFinishLaunching, so React Native
// startup is deferred here until SceneDelegate connects a window scene.
// NOTE: `npx expo prebuild --clean` regenerates this file and Info.plist; re-apply
// this change (and the UIApplicationSceneManifest entry) if you ever prebuild.

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  private var pendingLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?
  private var didStartReactNative = false

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

    // React Native (and Expo's launch-time subscribers, which need a key window)
    // start in startReactNative(in:connectionOptions:) once the scene connects.
    pendingLaunchOptions = launchOptions
    return true
  }

  /// Called by SceneDelegate when the app's window scene connects.
  func startReactNative(in windowScene: UIWindowScene, connectionOptions: UIScene.ConnectionOptions) {
    guard !didStartReactNative, let factory = reactNativeFactory else { return }
    didStartReactNative = true

    var launchOptions = pendingLaunchOptions ?? [:]
    if launchOptions[.url] == nil, let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)

    // Run Expo's didFinishLaunching subscribers (dev launcher, splash screen, ...)
    // now that the key window exists, matching the original call order.
    _ = super.application(UIApplication.shared, didFinishLaunchingWithOptions: launchOptions)

    // Universal link that launched the app.
    if let activity = connectionOptions.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb }) {
      _ = self.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
    }
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

/// Scene delegate required by the iOS 27 SDK. Registered in Info.plist under
/// UIApplicationSceneManifest as $(PRODUCT_MODULE_NAME).SceneDelegate.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene, let appDelegate else { return }
    appDelegate.startReactNative(in: windowScene, connectionOptions: connectionOptions)
    window = appDelegate.window
  }

  // Deep links while the app is running.
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate else { return }
    for context in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
      if let source = context.options.sourceApplication {
        options[.sourceApplication] = source
      }
      if let annotation = context.options.annotation {
        options[.annotation] = annotation
      }
      options[.openInPlace] = context.options.openInPlace
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  // Universal links while the app is running.
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
