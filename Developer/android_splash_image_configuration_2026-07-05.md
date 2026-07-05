# Android Splash Image Configuration - 2026-07-05

## Change

- Replaced Capacitor default splash images with `Graphic_designer/graphic_asset/game_icon_512.png`.
- Added Android 12+ splash attributes:
  - `windowSplashScreenBackground`
  - `windowSplashScreenAnimatedIcon`
  - `windowSplashScreenIconBackgroundColor`
  - `postSplashScreenTheme`

## Verification

- `JAVA_HOME="C:\Program Files\Android\Android Studio\jbr" ./gradlew :app:assembleDebug`
- Result: build successful.
