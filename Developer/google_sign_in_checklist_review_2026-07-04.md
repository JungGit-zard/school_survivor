# Google Sign-In Checklist Review — Escape Zombie School

Generated: 2026-07-04 KST
Repo: `D:/JungSil/2.Minigame_project/school_survivor-integration`
App root: `Developer/r3f_prototype`
Reviewed checklist: `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`

## Executive conclusion

Current build is structurally buildable and unit-tested, but **not safe to call fully Google-login-proof on Android internal testing yet**.

Top risk remains the same as the previous investigation: the app is a Capacitor Android app using **Firebase Web SDK `signInWithPopup`**, and `게임 시작` currently forces interactive Google login when signed out. Desktop/web OAuth entry can work, but installed Android WebView/Play distribution still has residual risk until a real-device internal-test login completes.

Recommended release-safe direction:

1. **Do not block `게임 시작` on Google login.** Allow guest/nickname flow if login is canceled, fails, or times out.
2. Add a **10–30 second timeout** and clear recovery UI for Google login.
3. Log raw Firebase/Auth error code/message for diagnosis.
4. For Android internal testing, verify Play App Signing SHA-1/256 from Play Console against Firebase/Google Cloud OAuth settings.
5. Real-device internal-test proof is still required because `adb` is unavailable on this machine.

## Evidence collected

- Current commit: `1709209`, branch `feature/stage2-corridor-floor-graphics`.
- AAB: `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`, size `9,474,046` bytes, modified `2026-07-04 15:43`.
- Package/app id: `com.jungyoon.zombieschool`.
- Version: `versionCode 5`, `versionName 1.0.4`.
- Capacitor: `@capacitor/android/core/cli ^8.3.4`; config `appId=com.jungyoon.zombieschool`, `webDir=dist`.
- Firebase JS SDK: `firebase ^12.14.0`.
- Native `google-services.json`: not present under `android/app`.
- Auth implementation: `src/lib/firebaseAuth.js` uses `GoogleAuthProvider` + `signInWithPopup`; no `signInWithRedirect` or `signInWithCredential` in bundled JS.
- Firebase authorized domains query succeeded: `localhost`, `escape-zombie-school.firebaseapp.com`, `escape-zombie-school.web.app`.
- Release upload signing SHA-1: `6F:06:BA:57:9D:08:BA:A0:98:AF:26:A5:3C:49:9B:54:0A:05:76:51`.
- Release upload signing SHA-256: `FE:18:FA:0E:BD:5C:E7:0F:30:04:6F:25:D3:07:5A:65:8A:2C:33:EA:DD:6F:5E:30:0C:85:FB:6E:E5:54:0F:3B`.
- Debug SHA-1 from Gradle signingReport: `5F:81:2E:C8:43:23:B9:7E:F7:6E:ED:27:EC:21:F4:6F:EC:FE:A2:61`.
- Test result: `77` test files passed, `450` tests passed.
- Android device check: `adb` not available, so installed-device login was not verified.

## PHASE 0 — Context Gathering

### P0-01 — 사용 스택 식별

- Status: PASS
- Evidence: React/Vite + Capacitor Android + Firebase Web Auth. `package.json` includes `firebase ^12.14.0`; `firebaseAuth.js` imports `firebase/app` and `firebase/auth` dynamically. No native Google Sign-In SDK / PGS SDK found.
- Remediation applied: none.

### P0-02 — 플러그인/SDK 버전 수집

- Status: PASS
- Evidence: `@capacitor/android/core/cli ^8.3.4`, `firebase ^12.14.0`, Android Gradle Plugin `8.13.0`, google-services plugin `4.4.4`, minSdk `24`, targetSdk `36`.
- Remediation applied: none.

### P0-03 — 서명 체계 확인

- Status: PARTIAL
- Evidence: Local release AAB is signed with local upload keystore alias `upload`. Play App Signing 여부와 실제 Play 재서명 앱서명 키는 local repo alone으로 확인 불가.
- Remediation applied: upload/debug SHA extracted; Play Console app-signing SHA must still be checked manually.

### P0-04 — 배포 트랙 확인

- Status: PARTIAL
- Evidence: Local AAB exists. Previous context indicates internal/play testing concern, but current local evidence cannot confirm exact Play track state.
- Remediation applied: marked as Play Console follow-up.

## PHASE 1 — 인증 자격 증명·서명 정합성

### P1-01 — 실제 유저 배포 아티팩트 SHA 추출

- Status: PARTIAL
- Evidence: Local upload AAB SHA extracted via Gradle/keytool. However, Play App Signing re-signs the artifact; actual user-installed SHA must be taken from Play Console App Bundle Explorer or Play App Signing page.
- Remediation applied: report includes local upload/debug SHA values.

### P1-02 — Play Console / Google Cloud / Firebase / PGS SHA 일치 검증

- Status: N/A / BLOCKED
- Evidence: Local environment has no authenticated Play Console / Google Cloud Console state. Firebase Web API authorized-domains query is available, but SHA registrations are console-side.
- Remediation required: verify Play app-signing SHA and upload/debug SHA are registered in Firebase/Google Cloud if native Android OAuth or Play Games is used. For current Web-SDK-only flow, authorized domains are more directly relevant than SHA, but Play-installed Android behavior can still be affected if moving to native login.

### P1-03 — debug/upload/app-signing 3종 키 등록 확인

- Status: N/A / BLOCKED
- Evidence: debug and upload SHA are extracted; app-signing SHA not available locally.
- Remediation required: in Firebase/Google Cloud/Play Console, register all required key fingerprints according to chosen auth implementation.

### P1-04 — package/applicationId 일치

- Status: PASS (local)
- Evidence: `applicationId`, namespace, and Capacitor `appId` are all `com.jungyoon.zombieschool`.
- Remediation applied: none.

### P1-05 — OAuth 클라이언트 중복 충돌

- Status: N/A / BLOCKED
- Evidence: Requires Google Cloud/Firebase Console access to inspect duplicate Android clients.
- Remediation required: check duplicate package+SHA combinations if native Android OAuth client creation fails or `DEVELOPER_ERROR(10)` appears.

### P1-06 — Web Client ID 확인

- Status: SKIP
- Evidence: Current code does not call `requestIdToken()` / `requestServerAuthCode()`; it uses Firebase Web `signInWithPopup`.
- Remediation applied: none.

### P1-07 — google-services.json 최신성

- Status: SKIP / WATCH
- Evidence: `android/app/google-services.json` is not present. That is acceptable for current Web-SDK-only Firebase config but would be required for native Firebase/Google Sign-In integration.
- Remediation required if migrating native: add latest `google-services.json` after registering SHA fingerprints.

## PHASE 2 — 콘솔·프로젝트 구성

### P2-01 — OAuth 동의 화면 게시 상태

- Status: N/A / BLOCKED
- Evidence: Requires Google Cloud Console.
- Remediation required: if ordinary users fail while developer works, verify consent screen is Production or tester accounts are listed.

### P2-02 — OAuth 동의 화면 지원 이메일

- Status: N/A / BLOCKED
- Evidence: Requires Google Cloud Console.
- Remediation required: confirm support email is set.

### P2-03 — Play Games Services 게시 상태

- Status: SKIP
- Evidence: No PGS SDK / GamesSignInClient usage found.
- Remediation applied: none.

### P2-04 — tester account registration

- Status: N/A / BLOCKED
- Evidence: Requires Play Console / OAuth Console.
- Remediation required: if internal/closed testing, verify tester list in both Play track and OAuth test users where relevant.

### P2-05 — Required APIs enabled

- Status: N/A / BLOCKED
- Evidence: Requires Cloud Console. Current Web Firebase Auth does not show People API / PGS usage.
- Remediation required only if using extra profile scopes or PGS.

### P2-06 — Firebase Auth Google provider enabled

- Status: N/A / BLOCKED
- Evidence: Local authorized domains query succeeded, but provider enabled status is not exposed by this query.
- Remediation required: verify Firebase Auth > Sign-in method > Google is enabled.

### P2-07 — Scope minimization

- Status: PASS (local)
- Evidence: Current Web SDK provider only sets `prompt: select_account`; no extra sensitive scopes found.
- Remediation applied: none.

## PHASE 3 — 클라이언트 코드·SDK 구현

### P3-01 — Deprecated API scan

- Status: PASS / WATCH
- Evidence: No `GoogleSignInClient` / `GoogleApiClient` found. However, current approach is Firebase Web popup inside Capacitor, which is not the strongest Android route.
- Remediation recommended: if Android internal test fails, migrate to `signInWithRedirect`/external-browser flow or native Google Sign-In + Firebase `signInWithCredential`.

### P3-02 — Plugin/version regression check

- Status: PASS / WATCH
- Evidence: Not using Unity PGS plugin. Capacitor 8.3.4 + Firebase Web 12.14.0 detected. No vendor issue tracker scan was performed in this local review.
- Remediation recommended: add weekly issue scan for Firebase Web Auth + Capacitor Android popup/redirect issues.

### P3-03 — Timeout/retry/fallback

- Status: FAIL
- Evidence: `signInWithGoogle()` awaits `client.signInWithGoogle()` directly; no timeout wrapper, retry/backoff, or guest fallback. `TitleScreen.handleStartClick` returns without starting game if no user UID after login attempt.
- Remediation recommended: add 10–30s timeout; on fail/cancel, allow guest/nickname flow or show manual retry without blocking game start.

### P3-04 — Silent Sign-In first strategy

- Status: PARTIAL
- Evidence: `initializeAuth` subscribes to Firebase `onAuthStateChanged`, so persisted Firebase login can restore silently. But if signed out, `게임 시작` triggers interactive popup immediately.
- Remediation recommended: keep passive restore, but avoid forced interactive login from primary start button.

### P3-05 — Raw error code logging

- Status: FAIL
- Evidence: `getErrorMessage(error)` is stored, but no raw `error.code` / `statusCode` analytics or structured log path found.
- Remediation recommended: log `error.code`, `error.message`, platform, app version, and auth flow stage to a safe analytics/diagnostic sink.

### P3-06 — Duplicate call prevention

- Status: PASS
- Evidence: store has `signingIn`; `handleStartClick` returns if `signingIn`; panel tests exist.
- Remediation applied: none.

### P3-07 — Activity lifecycle callback handling

- Status: SKIP / WATCH
- Evidence: No native activity result flow; Firebase Web popup handles browser flow. For Android WebView this remains a platform risk rather than an implemented callback issue.
- Remediation recommended if native migration: test Activity result/restart handling.

### P3-08 — ProGuard/R8

- Status: PASS
- Evidence: release `minifyEnabled false`, so R8 removal is unlikely.
- Remediation applied: none.

### P3-09 — Main-thread blocking

- Status: PASS (local code scan)
- Evidence: login/token path is asynchronous; no synchronous token exchange or blocking network call found in auth code.
- Remediation applied: none.

### P3-10 — Token expiry

- Status: PARTIAL
- Evidence: Firebase Auth manages Web token refresh; no explicit app-level token-expiry handling found.
- Remediation recommended: acceptable for Firebase Auth, but monitor auth-state errors and cloud-progress write failures.

## PHASE 4 — 디바이스·환경 요인

### P4-01 — Google Play Services / Play Games app version check

- Status: SKIP / WATCH
- Evidence: Current Web SDK flow does not call GoogleApiAvailability. If moving to native Google login, this becomes required.
- Remediation recommended: for native/PGS route, add Play Services availability/update prompt.

### P4-02 — OS-version failure dashboard

- Status: FAIL / NOT FOUND
- Evidence: No login analytics dashboard or OS-segmented failure instrumentation found in local code.
- Remediation recommended: capture login attempt/success/fail with platform/OS/app version.

### P4-03 — Multi-account issue handling

- Status: PARTIAL
- Evidence: provider forces account picker via `prompt: select_account`, which helps. No self-service account-reset guide in app found.
- Remediation recommended: support guide for account picker/cache reset.

### P4-04 — User self-resolution guide

- Status: FAIL / NOT FOUND
- Evidence: No in-app/support doc found in current scan.
- Remediation recommended: prepare Korean/Japanese/English FAQ for Play Services cache, Play Games cache, restart, re-add account, automatic date/time.

### P4-05 — Network restrictions

- Status: PARTIAL
- Evidence: generic error message exists; no network-specific branch found.
- Remediation recommended: branch `auth/network-request-failed` or equivalent to a clear network guidance message.

### P4-06 — GMS missing/custom ROM

- Status: PARTIAL
- Evidence: Current Web OAuth may still work in browser contexts, but no explicit GMS-missing detection or native fallback found.
- Remediation recommended: guest mode should remain available.

## PHASE 5 — Build/deploy pipeline

### P5-01 — Login test matrix

- Status: PARTIAL
- Evidence: Unit tests pass; previous desktop OAuth stress existed. No real-device internal-test matrix completed in this run because `adb` is unavailable.
- Remediation required: run matrix on installed internal-test build: new account, existing account, multi-account device.

### P5-02 — CI SHA automatic verification

- Status: FAIL / NOT FOUND
- Evidence: Local manual SHA extraction was possible, but no CI step was found that compares artifact SHA against registered console fingerprints.
- Remediation recommended: add CI/report script that extracts debug/upload SHA and prompts for Play app-signing SHA verification.

### P5-03 — google-services per flavor

- Status: SKIP
- Evidence: no `google-services.json`, no flavors detected.
- Remediation required if native Google/Firebase config is added.

### P5-04 — keystore change/rotation procedure

- Status: FAIL / NOT FOUND
- Evidence: keystore exists; no local rotation/runbook found in this review.
- Remediation recommended: document key rotation and SHA registration process.

### P5-05 — Store propagation delay

- Status: PASS (checklist documented)
- Evidence: saved checklist mentions 30 min–hours propagation delay.
- Remediation applied: none.

## PHASE 6 — Ops monitoring / maintenance

### P6-01 — Login funnel metrics

- Status: FAIL / NOT FOUND
- Evidence: no login funnel analytics instrumentation found.
- Remediation recommended: attempt/success/fail duration p50/p95 and error code distribution.

### P6-02 — 24–72h post-release monitoring

- Status: FAIL / NOT FOUND
- Evidence: no release-specific monitoring automation found.
- Remediation recommended: add release checklist item or cron/watchdog.

### P6-03 — External outage monitoring

- Status: FAIL / NOT FOUND
- Evidence: no Google/Firebase status monitor found.
- Remediation recommended: optional status-dashboard check in operations runbook.

### P6-04 — Vendor issue tracker weekly scan

- Status: PARTIAL
- Evidence: checklist includes this, but project automation not found.
- Remediation recommended: create weekly watchdog for Firebase/Capacitor Android auth keywords if this becomes a recurring release gate.

### P6-05 — Store review keyword monitoring

- Status: FAIL / NOT FOUND
- Evidence: no review keyword monitor found.
- Remediation recommended: monitor `로그인 안됨`, `무한 로딩`, `sign in`, etc.

### P6-06 — SDK/plugin update policy

- Status: PARTIAL
- Evidence: versions are pinned/ranged in package.json; no explicit staging login matrix policy found.
- Remediation recommended: require P5-01 matrix before Firebase/Capacitor updates.

### P6-07 — Account linking recovery path

- Status: PARTIAL / RISK
- Evidence: cloud progress and nickname are tied to auth user; current forced login can block start. Guest-to-Google merge/recovery flow is not clearly established.
- Remediation recommended: preserve guest flow, then add explicit link/merge path.

## Verification commands actually run

- `git rev-parse --short HEAD && git branch --show-current && git status --short`
- `find Developer/r3f_prototype -type f ... '*.aab' ...`
- `read_file` on package, Capacitor config, Android build files, manifest, Firebase auth code, title code.
- `JAVA_HOME='/c/Program Files/Android/Android Studio/jbr' ./gradlew :app:signingReport --console=plain`
- `keytool -list -v` with password masked/not reported.
- AAB unzip marker scan for `signInWithPopup`, `signInWithRedirect`, `signInWithCredential`, `GoogleAuthProvider`, `capacitor.config`.
- Firebase Identity Toolkit authorized domains query with API key not printed.
- `npm test -- --run`.
- `adb devices` attempted; `adb` not available.

## Immediate fix candidates, not applied in this review

1. Change `TitleScreen.handleStartClick` so failed/canceled Google login continues to guest nickname/start instead of returning.
2. Add `withTimeout(signInWithPopup, 15000)` and display retry/guest choices.
3. Store structured auth diagnostics: `code`, `message`, `flow`, `platform`, `appVersion`, elapsed ms.
4. Add Play internal-test real-device checklist to release gate.
5. If Android WebView fails, replace popup with mobile-safe redirect/external-browser or native Google Sign-In + Firebase credential flow.
