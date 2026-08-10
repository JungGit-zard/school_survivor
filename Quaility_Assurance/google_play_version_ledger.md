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
| 2026-07-07 | Internal testing | 14 | 1.0.6 | `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab` | Built, pending Console upload confirmation | SHA256 `BD54BBBAE838F46C20794575C46C35DF6DBDDD90E0B7B53E66DCB6462DFFD48C`. |
| 2026-07-08 | Internal testing | 15 | 1.0.7 | `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab` | Built, pending Console upload confirmation | SHA256 `9AD8E42DDE15D3529A4BEA0518C9E466616859A2F1D0B954D5D96A37D939225C`. |
| 2026-07-27 | Internal testing (planned) | 22 | 1.0.13 | `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release-v22.aab` | Built locally, not uploaded / Play Console confirmation pending | 15,376,272 bytes; SHA256 `18fd241812374952f6a289a2dccc31504c7e542335a098a5fb8fd114edf66803`; source SHA `74801277be2b21e6eb7afca45033c5e8ec43c689`. |
| 2026-08-10 | Local signed candidate | 31 | 1.0.16 | `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release-v31-20260810_0059-65678c7aa4df.aab` | Built locally, Play Console upload unconfirmed | 15,774,455 bytes; SHA256 `65678c7aa4df4623024e4b8e1a35765e9eb5eb132e7feaabc94016427f86737c`; source SHA `fef79ffcbffe6910f7666ba0df057545084ceb24`. |
| 2026-08-10 | Local signed candidate / HOLD | 33 | 1.0.18 | `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab` | **Built locally, upload held for device test** | SHA256 `0b9f3c83ca95ed2a0f35413e21977dba38cc929658705b0be416f8d2174b0db0`; login gate fixed: signed-out start requires Google login, success enters, failure/cancel blocks. Do not upload until 권실 기계 test passes. Case matrix: `Developer/구현기록/빌드배포/aab_v33_login_gate_case_matrix_2026-08-10.md`. |

## Next Build Default

- Before the next AAB build, confirm the latest Play Console version code. Use `versionCode 34` or higher if v33 is uploaded; never reuse `33` if it has been uploaded.
- If Play Console already has `33` or a higher version code, increase the next build above that value before rebuilding.
