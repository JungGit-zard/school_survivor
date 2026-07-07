# AAB build validation - 2026-07-07

## Verified

- `npm.cmd run build`
  - PASS. Existing Vite dynamic import and large chunk warnings remain.
- `npx.cmd cap sync android`
  - PASS. Found `@capacitor-firebase/authentication@8.3.0`.
- `.\gradlew.bat :app:bundleRelease`
  - PASS with Android Studio JBR.
- `jarsigner -verify android/app/build/outputs/bundle/release/app-release.aab`
  - PASS: `jar verified`.

## Artifact

- Path: `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`
- versionCode: `14`
- versionName: `1.0.6`
- SHA256: `BD54BBBAE838F46C20794575C46C35DF6DBDDD90E0B7B53E66DCB6462DFFD48C`

## Notes

- `jarsigner` reports the existing self-signed certificate chain warning.
- Play Console latest uploaded artifact was not checked here.
