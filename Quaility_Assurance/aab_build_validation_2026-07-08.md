# AAB build validation - 2026-07-08

## Checks

- `npm run build`: passed.
- `npx cap sync android`: passed.
- `.\gradlew.bat :app:bundleRelease`: passed with Android Studio JBR.
- `jarsigner -verify android/app/build/outputs/bundle/release/app-release.aab`: `jar verified`.

## Artifact

- Path: `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`
- versionCode: `15`
- versionName: `1.0.7`
- SHA256: `9AD8E42DDE15D3529A4BEA0518C9E466616859A2F1D0B954D5D96A37D939225C`
- Size: `17,874,567` bytes

## Notes

- Vite reported existing bundle-size and dynamic-import warnings; the web build still completed successfully.
- `jarsigner` reported the expected self-signed certificate and timestamp warnings, while the bundle verification result was `jar verified`.
