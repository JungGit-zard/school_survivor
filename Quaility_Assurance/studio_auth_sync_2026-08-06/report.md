# Graphics Studio auth/logout + immediate sync QA — 2026-08-06

## Scope

- Project: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype`
- Branch/head during verification: `zombie_only`, `f14cded`
- Focus:
  1. Graphics Studio login/logout path sanity
  2. Whether Graphics Studio changes are applied to the game immediately
  3. Hermes Kanban orchestration status

## Kanban orchestration

Created cards on board `escape-zombie-school`:

- `t_85a13978` — `uimini`: Graphics Studio login/logout auth behavior
- `t_bda76934` — `threemini`: immediate game apply/sync behavior
- `t_9d8ea9ca` — `balanceqa`: browser smoke test, dependent on the first two cards

Result: both parent worker profiles crashed twice and auto-blocked. Direct profile smoke checks returned:

```text
hermes -p uimini chat -q 'ping: reply exactly OK' --toolsets safe -Q
Error code: 401 ... token_expired

hermes -p threemini chat -q 'ping: reply exactly OK' --toolsets safe -Q
Error code: 401 ... token_expired

hermes -p balanceqa chat -q 'ping: reply exactly OK' --toolsets safe -Q
Error code: 401 ... token_expired
```

So the Kanban pipeline itself was exercised, but the specialist profiles need re-authentication before they can complete cards.

## Source-level findings

### Login/logout

Relevant files:

- `src/App.jsx`
  - `/graphics-studio` is gated unless `authStatus === 'signedIn'` and Studio runtime is ready.
  - Signed-out Studio route renders `AppBootstrap`, which contains `GoogleAccountPanel`.
  - General game route does **not** block on auth; `ReadyGameApp` remains mounted.
- `src/components/GoogleAccountPanel.jsx`
  - Signed-out state shows Google login button.
  - Signed-in state shows logout button via `onSignOut={signOutOfGoogle}`.
- `src/store/useAuthStore.js`
  - `signInWithGoogle()` uses a single in-flight guard to avoid multiple OAuth popups.
  - `signOutOfGoogle()` calls Firebase `client.signOut()`, clears cloud progress user, and sets `{ status: 'signedOut', user: null }`.
- `src/lib/firebaseAuth.js`
  - Web login uses `signInWithPopup(auth, provider)` with Google provider.
  - Logout calls Firebase `signOut(auth)` and native sign-out when on Capacitor.

Source conclusion: login/logout wiring is coherent, but full real-account logout verification was not completed because automated Google login requires credentials / account interaction.

### Immediate Studio → game sync

Relevant files:

- `src/components/GraphicsStudio.jsx`
  - `sendGameSync()` awaits `flushFirebaseStudioSave({ user: authUser })` before posting to the game window.
  - It returns `false` and shows `Game sync failed` if the game window cannot open or the Firebase flush is not `saved` / `no-pending`.
  - `Connect` now rehydrates Firebase Studio only and does not open the game or trigger a second login.
- `src/lib/studioGameBridge.js`
  - `STUDIO_GAME_SYNC_MESSAGE = 'escape-zombie-school.studioGameSync.v1'`
  - Local dev origins are canonicalized to `localhost` and cross-origin posting is restricted to local HTTP dev origins.
- `src/App.jsx`
  - `handleStudioGameSyncMessage()` accepts the sync message only from allowed origins and the opener window, then calls `hydrateFirebaseStudio({ user })`.

Source conclusion: the current code path is designed to flush Firebase first, then immediately tell the opened/reused game window to refetch Firebase Studio data.

## Automated test results

Command:

```bash
npm run test -- src/lib/firebaseAuth.test.js src/components/GraphicsStudio.test.jsx src/lib/studioGameBridge.test.js src/lib/firebaseStudio.test.js src/App.firebaseBootstrap.test.jsx
```

Result:

```text
Test Files  5 passed (5)
Tests       74 passed (74)
```

Important passing assertions covered:

- `Connect only rehydrates Firebase Studio and never opens the game`
- `Connect never opens the game for a signed-in user`
- `opens the game and requests a Firebase refresh when Apply is pressed`
- `does not report Apply success when the game window cannot open`
- `keeps the graphics studio route behind Google login even when canonical tuning makes studioReady true`
- Firebase auth client tests and Studio bridge origin parsing tests

First attempted command with Jest-style `--runInBand` failed because Vitest does not support that option; reran without it successfully.

## Production build result

Command:

```bash
npm run build
```

Result:

```text
✓ built in 765ms
Legacy B02 artifact gate passed (dist).
Title surface canonical gate passed.
Canonical title BGM artifact gate passed.
```

Vite warned that `vendor-three-esvZK1cN.js` is larger than 500 kB after minification; this is a bundle-size warning, not a build failure.

## Browser smoke results

Dev server:

```bash
npm run dev -- --host 127.0.0.1 --port 5188
```

Accessible at `http://localhost:5188/`.

### Signed-out `/graphics-studio`

URL: `http://localhost:5188/graphics-studio`

Observed text:

```text
G
계정 연동 가능
진행 정보 클라우드 저장 준비
Google 로그인

Google 로그인 후 Firebase Studio 데이터를 불러옵니다.
```

Screenshot:

- `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/studio_auth_sync_2026-08-06/screenshots/graphics-studio-signed-out-login-gate.png`

Clicking `Google 로그인` opened the Firebase/Google OAuth handler:

```text
https://escape-zombie-school.firebaseapp.com/__/auth/handler?...providerId=google.com...
```

Screenshot:

- `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/studio_auth_sync_2026-08-06/screenshots/google-oauth-popup.png`

Conclusion: signed-out Studio route correctly gates on Google login and the login button reaches the configured Firebase Google auth path. Full sign-in/sign-out could not be completed without account interaction.

### Dev E2E Studio bypass

URL: `http://localhost:5188/graphics-studio?e2e=1&studio=1`

Result: blank/crashed page.

Page errors:

```text
FirebaseStudioNotHydratedError: Firebase Graphics Studio hydrate is required before Studio read.
    at assertFirebaseStudioRuntimeReady (src/lib/studioRuntimeState.js:79)
    at getFirebaseStudioRuntimeDataset (src/lib/studioRuntimeState.js:60)
    at loadStudioTunings (src/lib/graphicsStudioConfig.js:1122)
    at loadStudioState (src/components/StudioTunedGroup.jsx:352)
    at StudioTunedRuntimeGroup (src/components/StudioTunedGroup.jsx:378)
```

Screenshot:

- `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/studio_auth_sync_2026-08-06/screenshots/graphics-studio-e2e-open.png`

Conclusion: the normal signed-out login gate works, but the dev-only Studio bypass route currently crashes before the Studio UI is visible. This prevented browser-level Apply/Connect testing without real Google login.

## Current git state before/after QA

Pre-existing/unrelated dirty files were present before this QA pass:

```text
M src/components/Enemies.jsx
M src/components/Enemies.test.jsx
M src/components/GraphicsStudio.jsx
M src/components/GraphicsStudio.test.jsx
M src/lib/waveTimelines.js
?? ../agent_room/soundmini_stage1_stage2_cheerful_bgm_production_record_2026-08-06.md
?? ../stage_bgm_drafts_2026-08-06/
?? ../../Quaility_Assurance/stage1_stage2_bgm_objective_audio_qa_2026-08-06.md
```

This QA pass added only the report/evidence folder:

```text
?? ../../Quaility_Assurance/studio_auth_sync_2026-08-06/
```

## Final verdict

- Login gate: **passes smoke** — `/graphics-studio` blocks signed-out users and exposes Google login.
- OAuth launch: **passes smoke** — login button opens Firebase Google auth handler.
- Logout: **source/test confidence only** — code path is present and coherent, but real logout was not completed because Google account interaction is required.
- Immediate Apply sync: **unit/integration tests pass** — Apply flushes Firebase then posts `escape-zombie-school.studioGameSync.v1` to the game window; failure to open game now reports `Game sync failed` instead of false success.
- Browser-level Apply sync: **blocked** — dev E2E Studio route crashes with `FirebaseStudioNotHydratedError`; real signed-in browser test needs manual Google login.
- Kanban: **blocked by profile auth** — `uimini`, `threemini`, and `balanceqa` profile tokens are expired (`401 token_expired`).

Recommended next fixes:

1. Re-auth Hermes worker profiles (`uimini`, `threemini`, `balanceqa`) so Kanban specialists can run again.
2. Fix the dev-only `/graphics-studio?e2e=1&studio=1` bootstrap so it commits/hydrates Studio runtime before components such as `StageBossPreview` read Studio datasets.
3. After that, rerun browser QA for `Connect`, `Apply`, and `Logout` with either the fixed E2E path or a manually signed-in Google session.
