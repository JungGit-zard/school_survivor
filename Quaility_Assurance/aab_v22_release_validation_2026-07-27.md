# AAB v22 Release Validation - 2026-07-27

## Scope and verdict

The local signed AAB integrity and source-to-Android asset copy gates passed. This record is **not** Play upload approval and is **No-Go** for Android visual-parity approval because no physical Android device or AVD run occurred.

## Source and pre-build gates

- Branch/source SHA: `zombie_only` / `74801277be2b21e6eb7afca45033c5e8ec43c689`
- Local `HEAD` equaled `origin/zombie_only` before building.
- Full JS tests passed: 163 files / 1,407 tests.
- Production web build passed.
- Desktop 1440x900 and mobile 390x844 web validation passed.
- Firebase data was not changed.

## Android build and payload checks

- `npx cap sync android`: passed.
- `dist/index.html` and Android copied `index.html` SHA-256 are identical: `d112f82146ec38ae2d445c062f752a2898e6f7bcc86de21b591f52a0629b8fa6`.
- `assets/index-CYTGtwQt.js` name and SHA-256 are identical in `dist` and Android assets: `3faed92078c0abbd1b22becf09cd6fb8346649462f65deec365276ba22594f4b`.
- `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr` plus `./gradlew.bat clean :app:bundleRelease`: passed.
- Merged release manifest: `versionCode 22`, `versionName 1.0.13`.
- `jar tf`: passed; 752 entries, including `base/assets/public/assets/index-CYTGtwQt.js`.
- `jarsigner -verify -certs -verbose`: exit 0; reports `jar verified.`.
- `keytool -printcert -jarfile`: passed; signing certificate SHA-256 is `fe18fa0ebd5ce70f30046f25d3075a658a2c33eadd6f5e300c85fb6ee5540f3b`.

## Artifact identity

- `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`
- `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release-v22.aab`
- Generated time: `2026-07-27 06:46:12 +09:00`
- Size: `15,376,272` bytes
- SHA-256 (both files): `18fd241812374952f6a289a2dccc31504c7e542335a098a5fb8fd114edf66803`

## Independent follow-up verification

- Advisor independently confirmed `git ls-remote origin refs/heads/zombie_only` equals the build-source SHA `74801277be2b21e6eb7afca45033c5e8ec43c689`.
- Direct reads from the AAB ZIP confirm `base/assets/public/index.html` SHA-256 `d112f82146ec38ae2d445c062f752a2898e6f7bcc86de21b591f52a0629b8fa6` and `base/assets/public/assets/index-CYTGtwQt.js` SHA-256 `3faed92078c0abbd1b22becf09cd6fb8346649462f65deec365276ba22594f4b`; both match the `dist` and Android copied assets.
- Mandatory balanceqa card `t_984b30dd` was created and run, but the Hermes openai-codex executor failed twice with OAuth-token-expired HTTP 401. This is an external review-runner authentication blocker, not an artifact-verification failure: the Advisor's independent checks retain the local artifact **PASS** conclusion, while automated balanceqa review remains incomplete.
- launchmini readiness card `t_9d793986` completed. Its artifact `Developer/agent_room/launchmini_aab_v22_readiness_2026-07-27.md` records Conditional Go for the local AAB and Play No-Go.

## Remaining No-Go gates

- Android device/AVD install, WebView visual parity, login, input, and gameplay smoke are not executed.
- Play Console has not been checked or uploaded; version-code availability remains unconfirmed.
- The source SHA is not automatically embedded in the AAB. Provenance is procedural: pushed source SHA equality before build plus the artifact hash recorded here.

Therefore, local artifact generation/integrity is **PASS**, while Android visual parity and Play internal-testing release approval are **NO-GO** pending their separate gates.
