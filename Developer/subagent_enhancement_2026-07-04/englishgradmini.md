# englishgradmini 30분 고도화 기록 — 2026-07-04

- 프로필: `englishgradmini` / English_Grad_Mini / 영문미니
- 실행 모드: 금일 나머지 서브에이전트 30분 self-improvement / capability-hardening 1회차
- 작업 시각 확인: `date '+%Y-%m-%d %H:%M:%S %Z'` → `2026-07-04 18:52:02`
- 작업 범위: Google Sign-In 이슈 방지 체크리스트를 영어 QA/support phrasing 및 릴리스 커뮤니케이션 readiness에 통합
- 금지 범위 준수: 코드 수정 없음, Play/Firebase Console 변경 없음, 배포 없음, commit/push 없음, 외부 메시지 없음, 다른 Hermes 프로필/TOML 수정 없음

## 1. 기준으로 읽은 문서/파일

- `project_develop_policy.md`
- `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`
- `Developer/subagent_enhancement_2026-07-04/RUN_MANIFEST.md`
- `marketing/auto_deploy_english_copy_readiness_2026-06-24.md`
- `Quaility_Assurance/title_start_google_login_gate_validation_2026-07-04.md`
- `Developer/google_login_stress_final_pushed_2026-07-04/REPORT.md`
- `Developer/r3f_prototype/src/components/GoogleAccountPanel.jsx`
- `Developer/subagent_enhancement_2026-07-04/launchmini.md`
- `Developer/subagent_enhancement_2026-07-04/backendmini.md`

## 2. 이번 고도화 결론

영문미니의 Google 로그인 관련 영어 산출물 규칙을 다음처럼 강화한다.

> Google login, cloud save, account linking, rankings, or release readiness must be phrased as conditional until Play-installed Android evidence exists. English copy must separate user-facing reassurance from unverified technical claims, and must never imply that Google login is guaranteed, fully production-ready, or globally validated before internal-test device proof is available.

현재 프로젝트의 영어 커뮤니케이션 판정:

- **Store listing claim**: `Google login`, `cloud save`, `account connection`, `sync across devices`는 아직 강한 홍보 문구로 쓰지 않는다.
- **Internal test / QA copy**: Android Play-installed build에서 Google login을 확인하는 테스트 안내 문구는 준비 가능하다.
- **Support copy**: 로그인 실패 시 사용자가 할 수 있는 안전한 안내 문구는 준비 가능하지만, 원인 단정(SHA mismatch 등)은 외부 사용자에게 직접 말하지 않는다.
- **Release notes**: “Fixed Google login”처럼 완료형 단정 대신 “Improved Google sign-in flow handling”처럼 검증 범위에 맞춘 표현을 쓴다.

## 3. English-facing QA phrasing rules

### A. QA test instruction wording

Use clear, observable steps. Avoid internal implementation jargon unless the audience is a tester/dev.

Recommended internal tester wording:

```text
Google Sign-In smoke test
1. Install the app from the Play internal testing link.
2. Launch the app on a real Android device.
3. Tap "Google Login" from the title screen.
4. Choose a Google account and complete the sign-in flow.
5. Confirm that the app returns to the title screen with the account shown.
6. Start the game, close the app, reopen it, and confirm that the sign-in state is preserved.
7. If sign-in fails or takes longer than 30 seconds, capture a screenshot and note the device model, Android version, Google Play services version, and the exact message shown.
```

Korean-to-English label preference for QA docs:

| Korean/UI source | English QA phrasing | Note |
|---|---|---|
| Google 로그인 | Google Login / Google Sign-In | “Sign-In” is preferred in formal QA and release docs; “Google Login” can mirror UI. |
| 로그인 중... | Signing in... | Avoid “Logging in...” in polished copy unless matching UI. |
| 로그인 오류 | Sign-in error | More natural for Google/Firebase auth contexts. |
| 다시 시도해 주세요 | Please try again. | Neutral and user-safe. |
| 저장된 로그인 확인 중 | Checking saved sign-in... | Clear for QA; shorter UI may use “Checking account...”. |
| 진행 정보 클라우드 저장 준비 | Account connection is being prepared | Do not claim “cloud save enabled” until verified. |

### B. Release note wording

Safe release-note options after partial/local-web verification only:

```text
- Improved Google sign-in flow handling on the title screen.
- Added clearer handling when Google sign-in is cancelled or unavailable.
- Improved account connection readiness for internal testing.
```

Do **not** use yet:

```text
- Google sign-in is fully fixed.
- Cloud save is now supported across all devices.
- Sign in once and keep your progress everywhere.
- Google Play Games login is now live.
```

Reason: current evidence includes web/Chromium popup stress success, but `Developer/google_login_stress_final_pushed_2026-07-04/REPORT.md` says Android internal-test/AAB final judgment is still pending.

### C. Store listing claim gate

Until Play-installed Android login completion is verified, keep store copy close to the existing cautious rule in `marketing/auto_deploy_english_copy_readiness_2026-06-24.md`:

```text
Account connection support is being prepared for testing.
```

Only after verified Android internal-test evidence should store-facing copy move to cautious positive wording such as:

```text
Sign in with Google to keep your progress connected on supported builds.
```

Even then, avoid “sync across all devices” unless restore behavior has been tested across reinstall/device-change scenarios.

## 4. Support-response templates for Google Sign-In issues

These are English templates for future CS/community responses. They intentionally avoid exposing internal console/SHA details or blaming the user.

### Template 1 — Login is stuck or takes too long

```text
Sorry about the trouble with Google Sign-In. Please try these steps:

1. Close and reopen the game.
2. Make sure Google Play services and the Google Play Games app are updated.
3. Check that your device date and time are set automatically.
4. Try again on a stable network connection.

If it still does not work, please send us your device model, Android version, and a screenshot of the message you see. This helps us check whether the issue is device-, account-, or build-specific.
```

### Template 2 — Account picker appears, then returns to the game without signing in

```text
Thanks for reporting this. If the Google account screen opens but sign-in does not complete, please try updating Google Play services and restarting the device first.

If the issue continues, please tell us:
- Device model
- Android version
- Whether you installed the app from the Play testing link
- The approximate time of the sign-in attempt

We will use this information to investigate the sign-in flow for that build.
```

### Template 3 — Internal tester evidence request

```text
Could you help us capture one Google Sign-In test result?

Please install the latest build from the Play internal testing link, tap Google Login, and let us know whether the app returns to the title screen with your account shown. If it fails, a screenshot plus your Android version is enough.
```

### Template 4 — Avoid overpromising progress recovery

```text
Please do not uninstall the app while we are checking the account issue unless we specifically ask you to. We want to avoid any chance of losing local progress before account connection is confirmed.
```

## 5. Risk phrasing map

| Risk from checklist/docs | English-facing phrasing rule | Why |
|---|---|---|
| Play-installed Android sign-in not yet proven | Say “pending real-device internal-test verification” | Honest release readiness language. |
| `signInWithPopup` may differ in Capacitor WebView | Say “Android WebView flow needs device validation” in internal docs only | Do not expose implementation uncertainty to players unless needed. |
| No timeout wrapper noted by backend/launchmini | In QA, treat >30s as failure to capture | Aligns with checklist P3-03. |
| Missing raw error code logging | Ask testers for exact message/screenshot/device data | Avoids inventing diagnoses. |
| Google login currently gates game start | Do not tell users “you can always continue as guest” until code supports it | Prevents false support claims. |
| Cloud save not fully validated | Avoid “cloud save,” “sync,” “recover anywhere” | Prevents store/user trust risk. |

## 6. English_Grad_Mini durable operating checklist update

For future Escape! zombie school English copy/release/support work:

1. Read the current Google Sign-In validation evidence before writing any account/cloud/ranking claim.
2. Use “Google Sign-In” in formal QA/release notes; mirror in-game “Google Login” only when referring to the exact UI button.
3. Do not claim cloud save, cross-device sync, Play Games Services login, or global rankings unless Launch/Backend/QA docs show verified production-like evidence.
4. For release notes, prefer scoped improvement language over “fixed” unless a real Android internal-test or production evidence loop confirms the issue is resolved.
5. For support copy, ask for device model, Android version, Play-installed build path, exact message/screenshot, and attempt time; do not speculate about OAuth/SHA/console misconfiguration to users.
6. Keep user instructions simple and non-blaming: update Google Play services, restart, stable network, automatic date/time, retry.
7. Avoid storing or requesting secrets/tokens. Screenshots should not include private account details beyond what the user willingly shares.

## 7. Today’s risks found

| Risk | Severity | Evidence | English/QA response |
|---|---:|---|---|
| Android Play-installed Google login still not final-verified | HIGH | Stress report says Android internal-test/AAB final judgment is pending | Store/release copy must remain conditional. |
| Current UI text implies cloud progress readiness | MEDIUM | `GoogleAccountPanel.jsx` detail: `진행 정보 클라우드 저장 준비` | English copy should phrase this as preparation/testing, not live cloud save. |
| Login failure appears to block game start in related launch/backend reviews | HIGH | `launchmini.md` and `backendmini.md` both flag title start/login fallback risk | Do not use support phrasing that promises guest fallback until implemented. |
| Support copy not yet centralized | MEDIUM | Existing marketing note had store readiness, not detailed login CS templates | This artifact adds ready-to-use English templates. |

## 8. Verification log

```text
2026-07-04 18:52:02 local date command executed.
Git status check: branch feature/stage2-corridor-floor-graphics ahead 2; existing modified/untracked files were present before this English artifact. No commit/push performed.
Artifact path verified by write/read workflow target: Developer/subagent_enhancement_2026-07-04/englishgradmini.md
```

## 9. 변경/생성 파일

- 생성: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/subagent_enhancement_2026-07-04/englishgradmini.md`
- 코드 변경: 없음
- 다른 Hermes 프로필/TOML 변경: 없음
- Play/Firebase Console 변경: 없음
- commit/push: 없음
