# launchmini AAB physical Android Google login mandatory preflight

Project: Escape! zombie school
Profile: launchmini
Scope: ANY Android App Bundle (AAB), Play internal-test/closed-test physical Android Google login, and release-readiness evidence
Canonical path: `Developer/agent_room/launchmini_aab_physical_android_google_login_mandatory_preflight.md`

## 1. Purpose

This document is the reusable mandatory launchmini preflight for any AAB, not a version-specific learning note.

> AAB 생성 후 반드시 Google Play 배포 경로의 실제 Android 기기에서 로그인·타이틀·로비·게임 진입을 테스트해 주세요.

Before the first task action in every Escape! zombie school invocation, launchmini must:

1. Run the central mandatory pre-command checker.
2. Confirm this document is present in `read_required` / `READ_REQUIRED`.
3. Read every emitted required document completely.
4. Stop on nonzero checker exit, missing central repository/checker, missing required document, unreadable required document, changed `combined_receipt_sha256`, or task-domain change until the checker is rerun and the new required documents are read.

Checker command template:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile launchmini -Domain auto -TaskSummary "<safe short keyword summary>"
```

Do not paste raw user commands into `TaskSummary`. Use a short safe keyword summary such as `AAB physical Android Google login`.

## 2. Required variables for every AAB task

Fill these variables before reporting readiness, upload guidance, local install smoke, or Play internal-test verdict. Unknown values are `미검증`, `BLOCKED`, or `NO-GO`; never invent them.

```text
AAB_PATH=<absolute or repository-relative exact AAB path>
EXPECTED_VERSION_CODE=<integer>
EXPECTED_VERSION_NAME=<string>
PACKAGE_ID=<Android applicationId/package, e.g. com.jungyoon.zombieschool>
EXPECTED_SIZE=<bytes or unknown>
EXPECTED_SHA256=<sha256 or unknown>
UPLOAD_KEY_SHA1=<colon fingerprint or unknown>
UPLOAD_KEY_SHA256=<colon fingerprint or unknown>
PLAY_APP_SIGNING_SHA1=<colon fingerprint or unknown>
PLAY_APP_SIGNING_SHA256=<colon fingerprint or unknown>
FIREBASE_ANDROID_OAUTH_SHA1=<colon fingerprint(s) or unknown>
FIREBASE_ANDROID_OAUTH_SHA256=<colon fingerprint(s) or unknown>
DEVICE_SERIAL=<adb serial for physical device>
INSTALL_TRACK_OR_SOURCE=<Google Play internal testing / closed testing / open testing / production / local bundletool APK / adb sideload / unknown>
EXPECTED_FIREBASE_ACCOUNT=<email/display name/uid checkpoint, redact secrets>
EXPECTED_PROGRESS_CHECKPOINTS=<gold, stages, best times, unlocks, lobby state>
EVIDENCE_DIR=<directory for screenshots, screen recordings, logcat, package/version/install-source dumps>
SCREENSHOT_PATHS=<paths>
SCREEN_RECORD_PATH=<path>
LOGCAT_PATH=<path>
PACKAGE_DUMP_PATH=<path>
VERSION_DUMP_PATH=<path>
INSTALL_SOURCE_DUMP_PATH=<path>
```

## 3. Authority and mutation boundaries

Default authority is read-only / evidence-only.

Do not perform any of the following without Terry's explicit current-task authority:

- Play Console upload, release creation, submission, publish, managed-publishing action, track/country/tester change.
- Firebase Console change, Firebase database/auth/progress mutation, OAuth client or SHA registration change.
- AAB rebuild, version bump, Gradle release build, source/runtime/game code change.
- Commit, push, reset, destructive checkout, or deletion of unrelated files.
- App data clearing, uninstall, or any destructive local-device cleanup.

If evidence collection needs a destructive action such as `adb shell pm clear` or uninstall, block for approval in headless Kanban instead of guessing.

Authentication/token expiry rule: if Hermes/OpenAI/Google/Play/Firebase authentication expires or produces 401/reauthentication errors, stop the affected path and ask the user/operator to reauthenticate. Do not bypass the mandatory agent/checker flow.

## 4. Freeze exact artifact identity

Never describe a mutable `app-release.aab` path as a stable object without freezing identity.

Record PRE and POST separately whenever a build or copy occurs:

```text
PRE_AAB_PATH=
PRE_VERSION_CODE=
PRE_VERSION_NAME=
PRE_MTIME=
PRE_SIZE=
PRE_SHA256=
PRE_MANIFEST_SOURCE=
PRE_SIGNATURE_STATUS=

POST_AAB_PATH=
POST_VERSION_CODE=
POST_VERSION_NAME=
POST_MTIME=
POST_SIZE=
POST_SHA256=
POST_MANIFEST_SOURCE=
POST_SIGNATURE_STATUS=
```

For an upload candidate, create/use only a unique immutable filename:

```text
app-release-v<EXPECTED_VERSION_CODE>-<YYYYMMDD_HHMM>-<sha12>.aab
```

Final upload guidance must name the unique path, size, SHA-256, versionCode, and versionName. Do not tell Terry to upload only a mutable build-output path.

## 5. Local AAB inspection gate

Run from the project root unless a command states otherwise. Adapt paths only; do not print secrets.

```bash
cd /d/JungSil/2.Minigame_project/school_survivor-integration
AAB="$AAB_PATH"
stat -c '%n|%s|%y' "$AAB"
sha256sum "$AAB"
```

Expected:

- Size matches `EXPECTED_SIZE` if known.
- SHA-256 matches `EXPECTED_SHA256` if known.
- Any mismatch is `NO-GO` until explained by an authorized rebuild or new artifact identity.

## 6. bundletool validation, manifest, and resources

Use official/known bundletool when available. Record tool path and SHA-256 when downloading or using a cached jar.

```bash
JAVA='/c/Program Files/Android/Android Studio/jbr/bin/java'
BUNDLETOOL='<bundletool jar path>'
AAB="$AAB_PATH"
"$JAVA" -jar "$BUNDLETOOL" validate --bundle "$AAB"
"$JAVA" -jar "$BUNDLETOOL" dump manifest --bundle "$AAB" --output "$EVIDENCE_DIR/manifest.xml"
"$JAVA" -jar "$BUNDLETOOL" dump resources --bundle "$AAB" --output "$EVIDENCE_DIR/resources.txt"
```

Fallback only when bundletool is unavailable: read Gradle-produced bundle/merged manifests and clearly label them as fallback, not official bundletool evidence.

Required checks:

- `package` == `PACKAGE_ID`.
- `versionCode` == `EXPECTED_VERSION_CODE`.
- `versionName` == `EXPECTED_VERSION_NAME`.
- `minSdk` / `targetSdk` recorded.
- Generated resources include presence-only markers for `default_web_client_id`, `google_app_id`, and `project_id` when Google login is in scope. Do not print resource values.

## 7. Signature and certificate gate

```bash
JAVA_HOME='/c/Program Files/Android/Android Studio/jbr'
JARSIGNER='/c/Program Files/Android/Android Studio/jbr/bin/jarsigner'
KEYTOOL='/c/Program Files/Android/Android Studio/jbr/bin/keytool'
AAB="$AAB_PATH"
"$JARSIGNER" -verify -verbose -certs "$AAB" > "$EVIDENCE_DIR/jarsigner.txt"
"$KEYTOOL" -printcert -jarfile "$AAB" > "$EVIDENCE_DIR/aab_cert.txt"
```

Required checks:

- `jarsigner` exits `0` and reports `jar verified`.
- Record upload-signing certificate SHA-1/SHA-256 from the AAB certificate output.
- Standard self-signed/certificate-chain/no-timestamp warnings are not automatically blockers if verification exits `0`; record them.
- Never print keystore passwords, aliases if sensitive, private keys, or signing material.

## 8. ZIP and critical asset gate

```bash
AAB="$AAB_PATH"
unzip -t "$AAB" > "$EVIDENCE_DIR/unzip_test.txt"
unzip -l "$AAB" > "$EVIDENCE_DIR/unzip_list.txt"
```

Required checks:

- ZIP test reports no compressed data errors.
- Critical web assets are present under `base/assets/public/`.
- Current JS/CSS entry names are recorded.
- Canonical title BGM must be present and byte-identical when release scope includes the game build:
  - expected source bytes: `998122`
  - expected source SHA-256: `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`
- Do not use asset presence alone as Android WebView visual parity evidence.

## 9. Native Capacitor/Firebase marker gate

For AABs with Google login scope, verify implementation/resource markers without exposing credential values:

- Capacitor Firebase Authentication plugin included.
- `FirebaseAuthentication` config includes `skipNativeAuth=true` and `providers=[google.com]` or equivalent native Google provider configuration.
- Android build generated Google services resources.
- Native flow bridges Google token into Firebase credential sign-in (`signInWithCredential` or equivalent).
- `rgcfaIncludeGoogle = true` or current plugin-required Google provider variable is set where required.

Marker presence is necessary but not sufficient. It does not prove Play-distributed physical-device login.

## 10. Upload key vs Play App Signing vs Firebase OAuth SHA comparison

Always separate these certificates:

- Upload key: signs the AAB submitted to Play.
- Play App Signing key: signs APKs delivered by Google Play.
- Firebase/Google Android OAuth SHA: must include the certificate fingerprint that signs the installed app being tested.

Comparison table template:

| Fingerprint | SHA-1 | SHA-256 | Source | Status |
| --- | --- | --- | --- | --- |
| Upload key / AAB signer | `<UPLOAD_KEY_SHA1>` | `<UPLOAD_KEY_SHA256>` | AAB `keytool -printcert -jarfile` | `<match/mismatch/unknown>` |
| Play App Signing | `<PLAY_APP_SIGNING_SHA1>` | `<PLAY_APP_SIGNING_SHA256>` | Play Console app signing page | `<match/mismatch/unknown>` |
| Firebase Android OAuth | `<FIREBASE_ANDROID_OAUTH_SHA1>` | `<FIREBASE_ANDROID_OAUTH_SHA256>` | Firebase Android app / google-services.json presence-safe inspection | `<match/mismatch/unknown>` |

Verdict rules:

- Local APK generated from an upload-key-signed AAB is only local install smoke unless its signing certificate is confirmed to match the OAuth SHA used by the installed login path.
- Strict Google login acceptance for Play distribution requires Google Play internal/closed/open/production install using the Play App Signing certificate and matching Firebase OAuth registration.
- If Play App Signing fingerprint is unknown or not compared, verdict is `미검증` or `NO-GO`, not PASS.

## 11. Local install smoke vs Play internal-test verdict

Local bundletool/APK install can answer only:

- package installs locally;
- first launch does not immediately crash;
- manifest/resources/signature shape is plausible.

Local install cannot by itself prove:

- Play App Signing certificate path;
- Play delivery/split behavior;
- tester eligibility;
- Play install source;
- Play-distributed Google login;
- production/global readiness.

Use labels precisely:

- `local-only PASS`: local install/launch checks passed but Play-distributed login remains unverified.
- `PASS`: strict Play-distributed physical Android login and gameplay evidence passed.
- `NO-GO`: required gate failed or unavailable.
- `BLOCKED`: required human credential, device, account, Play/Firebase access, or approval is missing.
- `미검증`: not directly observed in tool output, screenshot, console evidence, or clearly labelled user-provided evidence.

## 12. Physical Android adb gate

Known adb path:

```text
C:/Users/admin/AppData/Local/Android/Sdk/platform-tools/adb.exe
```

Device gate:

```bash
ADB='/c/Users/admin/AppData/Local/Android/Sdk/platform-tools/adb.exe'
"$ADB" devices -l > "$EVIDENCE_DIR/adb_devices.txt"
```

Required:

- `DEVICE_SERIAL` appears as `device`.
- Not `unauthorized`, `offline`, empty, emulator when a physical device is required, or wrong serial.
- If USB debugging authorization prompt appears, user must accept it on the phone.
- Wireless debugging pairing details must be supplied/approved by the user; do not guess ports or credentials.

If no authorized physical device exists, report `NO-GO: physical Android device not connected/authorized`.

## 13. Non-destructive package/data guard

Before install or launch evidence, inspect state non-destructively:

```bash
ADB='/c/Users/admin/AppData/Local/Android/Sdk/platform-tools/adb.exe'
PKG="$PACKAGE_ID"
SERIAL="$DEVICE_SERIAL"
"$ADB" -s "$SERIAL" shell pm list packages "$PKG" > "$EVIDENCE_DIR/package_list_before.txt"
"$ADB" -s "$SERIAL" shell dumpsys package "$PKG" > "$EVIDENCE_DIR/package_dump_before.txt"
"$ADB" -s "$SERIAL" shell cmd package list packages -i "$PKG" > "$EVIDENCE_DIR/install_source_before.txt"
```

Destructive commands require explicit approval and are not safe defaults in headless Kanban:

```bash
adb shell pm clear "$PACKAGE_ID"
adb uninstall "$PACKAGE_ID"
```

If a fresh logged-out session requires data clearing and no approval exists, block for approval instead of clearing.

## 14. Exact delivered build install/source verification

Strict Play-distributed acceptance requires install/update from the intended Play track, not a locally generated upload-key APK.

Evidence to capture:

```bash
ADB='/c/Users/admin/AppData/Local/Android/Sdk/platform-tools/adb.exe'
PKG="$PACKAGE_ID"
SERIAL="$DEVICE_SERIAL"
"$ADB" -s "$SERIAL" shell dumpsys package "$PKG" > "$EVIDENCE_DIR/package_dump_after.txt"
"$ADB" -s "$SERIAL" shell cmd package list packages -i "$PKG" > "$EVIDENCE_DIR/install_source_after.txt"
"$ADB" -s "$SERIAL" shell dumpsys package "$PKG" | grep -Ei 'versionCode|versionName|firstInstallTime|lastUpdateTime|installerPackageName|signatures|Signing' > "$EVIDENCE_DIR/version_install_summary.txt"
```

Required checks:

- Installed `PACKAGE_ID` matches.
- Installed versionCode/versionName match `EXPECTED_VERSION_CODE` / `EXPECTED_VERSION_NAME`.
- Install source indicates Google Play for strict Play verdict, or is explicitly labelled local/sideload for local-only verdict.
- Evidence path is recorded.

## 15. Fresh logged-out native Google login procedure

Strict acceptance sequence:

1. Confirm tester account is eligible for the selected Play test track.
2. Install/update the exact delivered build from Google Play internal/closed/open testing or production as authorized.
3. Start from a fresh/logged-out app session. If clearing app data is required, get explicit approval first.
4. Open the app on the physical Android device.
5. Tap Google login.
6. Confirm native Android Google account chooser appears.
7. Select the expected Google account.
8. Confirm Firebase credential sign-in succeeds and returns to the app, not external Chrome localhost/redirect failure.
9. Confirm expected account and progress checkpoints.
10. Confirm lobby usability.
11. Enter actual gameplay, at minimum Stage 1, and observe play start.

Do not use project-prohibited local URLs for evidence:

- `http://127.0.0.1:5173/`
- `http://172.22.41.219:5173/`

## 16. Expected Firebase account/progress checkpoints

Use task-provided expected values. If the task concerns Terry's current master account, the project policy currently records these observation checkpoints:

```text
EXPECTED_FIREBASE_ACCOUNT.email=zard5388@gmail.com
EXPECTED_FIREBASE_ACCOUNT.display_name=정실장
EXPECTED_PROGRESS_CHECKPOINTS.gold=205
EXPECTED_PROGRESS_CHECKPOINTS.stage1_best=12:46
EXPECTED_PROGRESS_CHECKPOINTS.stage2_best=6:06
EXPECTED_PROGRESS_CHECKPOINTS.stage3_best=5:21
EXPECTED_PROGRESS_CHECKPOINTS.stage4_best=8:01
EXPECTED_PROGRESS_CHECKPOINTS.unlocks=Stages 1-4 unlocked/enterable
```

These are observation checkpoints for account matching, not seed/default values to write. Do not mutate Firebase progress to make a test pass.

Fail / `NO-GO` if:

- External Chrome localhost/Firebase redirect page appears.
- Native chooser does not appear when expected.
- Firebase credential flow fails.
- Account/progress is empty, reset, wrong user, wrong stage unlocks, or wrong lobby state.
- Lobby is unusable.
- Actual gameplay entry fails.
- Evidence came only from local upload-key APK while strict Play verdict was requested.

## 17. Screenshot, screen-record, logcat, package/version/install-source evidence

Capture visual and device evidence when authorized/available:

```bash
ADB='/c/Users/admin/AppData/Local/Android/Sdk/platform-tools/adb.exe'
SERIAL="$DEVICE_SERIAL"
PKG="$PACKAGE_ID"
"$ADB" -s "$SERIAL" shell screencap -p /sdcard/launchmini_login_checkpoint.png
"$ADB" -s "$SERIAL" pull /sdcard/launchmini_login_checkpoint.png "$EVIDENCE_DIR/launchmini_login_checkpoint.png"
"$ADB" -s "$SERIAL" logcat -c
"$ADB" -s "$SERIAL" logcat -v time > "$EVIDENCE_DIR/logcat_full.txt"
```

Useful logcat filter:

```bash
grep -Ei 'Firebase|FirebaseAuth|GoogleSignIn|Credential|Capacitor|FirebaseAuthentication|com\.jungyoon\.zombieschool|chromium|localhost|ERR_CONNECTION_REFUSED' "$EVIDENCE_DIR/logcat_full.txt" > "$EVIDENCE_DIR/logcat_auth_filtered.txt"
```

Logcat is supporting evidence only. It does not replace visual native chooser/account/progress/gameplay evidence.

Redact credential-like values, tokens, cookies, refresh tokens, ID tokens, auth codes, passwords, private keys, and raw session material before reporting.

## 18. PASS / FAIL / BLOCKED / NO-GO vocabulary

Use only evidence-backed terms:

- `PASS`: every stated strict acceptance item was observed and evidence paths are recorded.
- `FAIL`: the test ran and observed behavior did not meet acceptance.
- `BLOCKED`: the work cannot proceed without human reauthentication, device authorization, Play/Firebase/Google Console access, destructive-cleanup approval, tester eligibility, or another missing prerequisite.
- `NO-GO`: a release/readiness gate failed or is unavailable; do not upload/submit/release.
- `local-only PASS`: local install/launch/smoke passed but strict Play-distributed login is not proven.
- `미검증`: not observed directly.

Never convert `미검증`, `local-only PASS`, or `user said it probably works` into `PASS`.

## 19. Final report template

```text
AAB identity: <AAB_PATH, bytes, sha256, package, versionCode, versionName>
PRE/POST distinction: <recorded / not applicable / missing -> NO-GO>
Unique upload candidate: <path or not authorized/not created>
Bundletool/manifest/resources: <PASS/FAIL/BLOCKED, evidence paths>
Signature/certificates: <upload key SHA, Play App Signing SHA, Firebase OAuth SHA comparison>
ZIP/critical assets/native markers: <PASS/FAIL/BLOCKED>
Device: <DEVICE_SERIAL/model or NO-GO>
Install source: <Google Play internal/closed/open/production/local/unknown>
Installed version: <versionCode/versionName/package evidence>
Login flow: <native chooser / external redirect / not observed>
Firebase credential result: <success/fail/not observed>
Expected account/progress: <observed values or not observed>
Lobby/gameplay: <lobby usable, Stage 1 entered, or not observed>
Verdict: <PASS/FAIL/BLOCKED/NO-GO/local-only PASS/미검증>
Evidence output paths: <screenshots, recording, logcat, package dumps>
Forbidden actions avoided: no commit, no push, no Play upload/submission/publish, no Firebase mutation, no unauthorized AAB rebuild, no destructive app-data action
```

## 20. v28 worked example only

This section is only a worked example from verified prior cards `t_7e99a4e3`, `t_ef18e078`, `t_3271b888`, and `t_ccf1f465`. It is not the mandatory document identity and must not be treated as the only AAB workflow.

Verified v28 values from the prior read-only preparation:

```text
AAB_PATH=Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release-v28.aab
EXPECTED_SIZE=14283576
EXPECTED_SHA256=2a2adb6ab62a51941418becd87a9352a433073407109e69f224aaa1931e68813
PACKAGE_ID=com.jungyoon.zombieschool
EXPECTED_VERSION_CODE=28
EXPECTED_VERSION_NAME=1.0.15
minSdk=24
targetSdk=36
UPLOAD_KEY_SHA1=6F:06:BA:57:9D:08:BA:A0:98:AF:26:A5:3C:49:9B:54:0A:05:76:51
UPLOAD_KEY_SHA256=FE:18:FA:0E:BD:5C:E7:0F:30:04:6F:25:D3:07:5A:65:8A:2C:33:EA:DD:6F:5E:30:0C:85:FB:6E:E5:54:0F:3B
FIREBASE_ANDROID_OAUTH_SHA1_OBSERVED_IN_GOOGLE_SERVICES_JSON=12:20:BD:60:77:76:25:E1:A3:E1:BA:4D:F2:6D:2E:78:0F:98:24:FA
TITLE_BGM_AAB_SIZE=998122
TITLE_BGM_AAB_SHA256=991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe
```

Known v28 markers:

- Capacitor Firebase Authentication plugin included.
- `skipNativeAuth=true` configured.
- `providers=[google.com]` configured.
- Native Google sign-in flow bridges into Firebase `signInWithCredential`.
- Generated Android resources contain presence-only markers for `default_web_client_id`, `google_app_id`, and `project_id`.

Why the upload-key local APK was non-conclusive:

- The observed Firebase Android OAuth SHA-1 did not match the v28 upload-key SHA-1.
- A local universal APK generated by bundletool from the AAB and signed with the upload key can validate local package/install/launch shape, but it does not exercise Google Play's distributed APK signing path.
- Strict v28 Google login acceptance required physical Android install through Google Play internal testing / Play App Signing, then native chooser -> Firebase credential -> expected master account/progress -> lobby -> actual gameplay evidence.

## 21. No external mutation without explicit authority

This preflight is a guardrail document. It authorizes evidence collection and reporting only within the current task's scope. It never grants permission to mutate Play Console, Firebase, source code, signing material, device data, or production/global rollout.
