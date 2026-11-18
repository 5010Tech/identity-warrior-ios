# Identity Warrior (iOS)

Expo / React Native biometric capture app by 5010 Tech, LLC.

- Bundle ID: `com.fiftyten.identitywarrior`
- Native project: `ios/IdentityWarrior.xcworkspace`

## First-time setup

1. **Install dependencies**

   ```bash
   npm install
   cd modules/slapshot-capture-library && npm install && rm -rf node_modules && cd ../..
   ```

   The Slapshot library's own `node_modules` is removed because it conflicts with the root `node_modules`.

2. **Install pods**

   ```bash
   cd ios && pod install && cd ..
   ```

3. **Signing**: open `ios/IdentityWarrior.xcworkspace` in Xcode → target **IdentityWarrior** →
   Signing & Capabilities → check *Automatically manage signing* → Team **5010 Tech, LLC**.
   Copy the 10-character Team ID into `app.json` as `expo.ios.appleTeamId` so it survives a prebuild.

4. **EAS** (one time, signed in to the 5010 Expo account):

   ```bash
   npx eas-cli login
   npx eas-cli init     # creates the EAS project and writes its projectId into app.json
   ```

## Run on a connected iPhone (local)

```bash
npm run ios          # npx expo run:ios --device
```

After the dev client is installed, day-to-day JS/TS changes only need `npx expo start`.
Rebuild only when native dependencies, `app.json`, or anything under `modules/` changes.

## EAS builds (local)

```bash
npm run eas:dev        # development client  -> builds/dev
npm run eas:preview    # internal/ad hoc     -> builds/preview
npm run eas:production # App Store           -> builds/production
```

Register test devices with `npx eas-cli device:create`.

## Regenerating the native project

If you ever run a clean prebuild, restore the Podfile afterwards. It contains the
Slapshot SDK pod lines that prebuild removes:

```bash
npx expo prebuild --platform ios --clean && git restore ios/Podfile && cd ios && pod deintegrate && pod install && cd ..
```

## Xcode 27 / iOS 27 SDK compatibility patches

Expo SDK 54 / React Native 0.81 predate the iOS 27 SDK, so the project carries these fixes.
Re-apply them if the native project is regenerated or a vendor SDK is replaced:

1. **Pod deployment targets** (`ios/Podfile` `post_install`): raises every pod below the
   app's deployment target (17.0) up to it. Xcode 27 rejects pod targets below iOS 15.
2. **fmt consteval** (`ios/Podfile` `post_install`): patches `Pods/fmt/include/fmt/base.h`
   to `FMT_USE_CONSTEVAL 0`. Without it, fmt 11.0.x fails under newer Apple Clang.
3. **Slapshot SDK interfaces** (`modules/slapshot-sdk*/**/*.swiftinterface`): the
   `swift-module-flags` target is raised from iOS 14.0 to 17.0 so the frameworks can import
   CocoaLumberjack built for 17.0. A new SDK drop from Slapshot overwrites this.
4. **UIScene life cycle** (`ios/IdentityWarrior/AppDelegate.swift` + `Info.plist`
   `UIApplicationSceneManifest`): the iOS 27 SDK requires scene-based apps. React Native
   now starts from `SceneDelegate` instead of `didFinishLaunching`. A
   `npx expo prebuild --clean` regenerates both files, so re-apply this change after one.
