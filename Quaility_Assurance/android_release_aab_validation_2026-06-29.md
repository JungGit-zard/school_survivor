# Android Release AAB Validation - 2026-06-29

## Result

- Pull: `git pull` returned already up to date.
- Version: `versionCode 3`, `versionName "1.0.2"`.
- Web build: `npm run build` passed. Existing large chunk warning remains.
- Android sync: `npx cap sync android` passed.
- Release bundle: `gradlew.bat :app:bundleRelease` passed with Android Studio JBR and local Android SDK env vars.
- Signing check: `jarsigner -verify` returned `EXIT=0`.

## Artifact

- Path: `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`
- Size: `10837406` bytes
- SHA256: `20883319FA241CB82BC39D0F78537B0DD0EFA80BEC07D53DA24D097E9741BE89`

## Notes

- The signing certificate is self-signed, so `jarsigner` reports certificate-chain and timestamp warnings while still verifying the bundle.
- Play Console must still confirm that no uploaded artifact already uses `versionCode 3` or higher.
