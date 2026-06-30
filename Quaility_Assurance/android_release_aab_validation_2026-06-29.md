# Android Release AAB Validation - 2026-06-29

## Result

- Pull: `git pull` returned already up to date.
- Version: `versionCode 4`, `versionName "1.0.3"`.
- Web build: `npm run build` passed. Existing large chunk warning remains.
- Android sync: `npx cap sync android` passed.
- Release bundle: `gradlew.bat :app:bundleRelease` passed with Android Studio JBR and local Android SDK env vars.
- Signing check: `jarsigner -verify` returned `EXIT=0`.

## Artifact

- Path: `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`
- Size: `9447885` bytes
- SHA256: `A1408606A0F9C92C5D6A73C6C262681803641B6E8BF4D57C45B5F311ABD4BDF4`

## Notes

- The signing certificate is self-signed, so `jarsigner` reports certificate-chain and timestamp warnings while still verifying the bundle.
- Play Console must still confirm that no uploaded artifact already uses `versionCode 4` or higher.
