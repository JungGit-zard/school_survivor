# Google Play Version Ledger

This is the durable version ledger for Google Play internal testing AAB uploads.

## Rules

- Never reuse a `versionCode` once it has been uploaded to Play Console.
- Before every AAB build, check this ledger and Play Console's latest uploaded artifact.
- If Play Console has already seen the planned `versionCode`, increase it before rebuilding.
- `versionCode` is the upload gate. `versionName` is the visible release label.

## Version History

| Date | Track | versionCode | versionName | Artifact | Status | Notes |
| --- | --- | ---: | --- | --- | --- | --- |
| 2026-06-21 | Internal testing | 2 | 1.0.1 | `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab` | Built | Historical record says this was prepared after versionCode 1 reuse error. Play Console upload status should be checked in Console. |
| 2026-06-29 | Internal testing | 3 | 1.0.2 | `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab` | Built, pending Console upload confirmation | SHA256 `20883319FA241CB82BC39D0F78537B0DD0EFA80BEC07D53DA24D097E9741BE89`. |
| 2026-06-29 | Internal testing | 4 | 1.0.3 | `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab` | Built, pending Console upload confirmation | SHA256 `A1408606A0F9C92C5D6A73C6C262681803641B6E8BF4D57C45B5F311ABD4BDF4`. |

## Next Build Default

- If `versionCode 4` uploads successfully, the next AAB should start at `versionCode 5`, `versionName 1.0.4`.
- If Play Console rejects `versionCode 4` as already used, rebuild immediately with `versionCode 5`, `versionName 1.0.4`.
