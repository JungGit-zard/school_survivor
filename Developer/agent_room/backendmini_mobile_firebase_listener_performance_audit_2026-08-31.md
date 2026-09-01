# Backend_Mini Firebase auth/listener mobile performance audit — 2026-08-31

Task: t_93333ec5 — `firebase-listener-mobile-performance-audit`

Scope/guardrails:
- Read-only source/history audit, except for this report file.
- Firebase must remain storage-only for the Stage 1 mobile loop; do not mutate Firebase data, auth persistence, source, localStorage, commits, or deployed state.
- No live Firebase connection was opened by this audit. All findings below are from source/history and focused offline tests.

Mandatory/project context read:
- Mandatory precommand checker passed in the active retry using TaskSummary `firebase-listener-mobile-performance-audit`.
- Required/project docs inspected before source audit: `AGENTS.md`, `Bang_Rules.md`, `CLAUDE.md`, `project_develop_policy.md`, `CEO/current_product_priorities.md`, `SESSION_CONTINUITY.md`, `SESSION_MEMORY.md`, mandatory-precommand manifest/README, and prior Firebase/Android boundary docs named in the worker handoff.

Verification performed:
- Focused offline test command, run from `Developer/r3f_prototype`:
  - `npm.cmd exec -- vitest run src/App.firebaseBootstrap.test.jsx src/lib/firebaseAuth.test.js src/lib/firebaseProgress.test.js src/lib/firebaseStudio.test.js src/lib/firebaseInspectionMode.test.js src/lib/firebaseRanking.test.js src/components/UserRanking.test.jsx src/components/StageRanking.test.jsx`
  - Result: 8 test files passed, 126 tests passed, duration 61.49s.
- Git history inspected for the audited Firebase/auth/listener files:
  - Recent relevant commits include `4c8f596d`, `e25bc085`, `2643f848`, `2910086f`, `1521b3b1`, `7c5315c6`, `2363fc85`, `bb0d7e1a`, `e2cd6020`, `ded175ab`, `dd6fb315`.

## Executive summary

No obvious infinite Firebase listener leak was found in the normal game screen path. The code consistently returns RTDB/Auth unsubscribe callbacks for the explicit React-mounted subscriptions that were inspected.

The highest-risk mobile overhead hypothesis is architectural rather than a missing cleanup: `App.jsx` subscribes every client, including ordinary gameplay clients, to `runtimeControl/v1/inspection` at app mount. That keeps one RTDB `onValue` listener alive for the whole game session even when the player never opens ranking/admin/studio. If Galaxy A24 slowdown correlates with Firebase/network contention, this is the first Firebase listener to instrument.

Second-risk hypothesis: Google sign-in success can request cloud progress hydration twice, once in the explicit `signInWithGoogle` path and once in `onAuthStateChanged`. There are stale-user guards, but no in-flight hydration dedupe for the same uid, so login-start/lobby transition can briefly duplicate RTDB `get(users/{uid})` work and Zustand state churn.

Ranking/studio subscriptions look bounded by screen/route and have cleanup paths. They should be instrumented but are less likely to explain sustained gameplay slowdown unless players leave ranking/studio mounted or the WebView keeps hidden screens alive unexpectedly.

## Ranked falsifiable hypotheses

### H1 — High: global inspection RTDB listener stays active across gameplay

Evidence:
- `Developer/r3f_prototype/src/App.jsx:103-129` mounts `subscribeInspectionMode` once for the entire app and cleans it only on app unmount.
- `Developer/r3f_prototype/src/lib/firebaseInspectionMode.js:95-136` resolves a Firebase client and returns a subscription wrapper.
- `Developer/r3f_prototype/src/lib/firebaseInspectionMode.js:138-153` creates an RTDB client and calls `databaseModule.onValue(reference(path), ...)`.
- `Developer/r3f_prototype/src/lib/firebaseInspectionMode.js:4` fixes the path at `runtimeControl/v1/inspection`.
- `Developer/r3f_prototype/src/App.jsx:359-365` lets this remote state override normal gameplay with `InspectionModeScreen` while active.

Why it can hurt Galaxy A24/mobile:
- It is a real-time network listener on every normal app session, independent of player intent.
- Even low-frequency RTDB keepalive/reconnect activity can add WebView JS/network wakeups and battery cost on budget devices.
- It also increases auth/Firebase initialization surface during the Stage 1 loop, contrary to the current product priority of stabilizing the offline/mobile loop before backend systems.

Counter-evidence / bounds:
- Cleanup exists in `App.jsx:125-128`.
- Invalid/missing data is normalized inactive in `firebaseInspectionMode.js:39-41` and errors fail open in `App.jsx:110-123`.
- The listener is one path, not an accumulating listener per screen transition.

Safe instrumentation:
1. In `firebaseInspectionMode.test.js`, inject a fake client whose `subscribe` increments `activeInspectionListeners` and whose unsubscribe decrements it; render `App`, navigate title→lobby→game→ranking→back, assert active count remains exactly 1 and returns 0 on unmount.
2. Add DEV-only `performance.mark('firebase-inspection-subscribe')` and `performance.mark('firebase-inspection-event')` around `subscribeInspectionMode` callback, with no payload/user data.
3. In Android WebView profiling, compare a build with `VITE_FIREBASE_DATABASE_URL` unset or inspection subscription stubbed to inactive against the current build; measure network requests/wakeups and FPS/long tasks on Galaxy A24.

Potential follow-up boundary, not implemented here:
- Defer the inspection subscription until after the title screen or poll one-shot on app start, if product accepts less immediate maintenance-mode updates.
- If real-time maintenance mode is required, keep it but count/list the one listener explicitly in a DEV diagnostics panel so regressions are visible.

### H2 — High/Medium: duplicate same-uid progress hydration after Google sign-in

Evidence:
- `Developer/r3f_prototype/src/store/useAuthStore.js:35-44` subscribes to Firebase Auth and calls `syncCloudProgressUser(user)` on every auth-state user emission.
- `Developer/r3f_prototype/src/store/useAuthStore.js:55-83` handles explicit Google sign-in and also calls `syncCloudProgressUser(user)` at lines 68-70 after `client.signInWithGoogle()` resolves.
- `Developer/r3f_prototype/src/store/useAuthStore.js:120-148` starts an async `hydrateCloudProgress(user)` whenever `isFirebaseProgressHydrated(user)` is false.
- `Developer/r3f_prototype/src/lib/firebaseProgress.js:135-166` performs a remote `client.load(path)` for `users/{uid}`.
- `Developer/r3f_prototype/src/lib/firebaseProgress.js:500-524` implements `client.load` as RTDB `get(ref(database, path))`.

Why it can hurt Galaxy A24/mobile:
- A normal login can trigger both the promise path and the auth-state listener path close together.
- `isFirebaseProgressHydrated(user)` only checks completed hydration; it does not represent same-uid in-flight hydration.
- Duplicate `get(users/{uid})` plus duplicate `reloadPersistentProgress()` can add startup jank exactly when the title/lobby transition and asset loading compete for main-thread time.

Counter-evidence / bounds:
- `googleSignInInFlight` dedupes the OAuth popup itself (`useAuthStore.js:55-83`).
- Stale-user checks prevent a late hydrate from applying to a different uid (`useAuthStore.js:131-144`, `firebaseProgress.js:145-160`).
- This is a burst risk around login, not a persistent listener leak.

Safe instrumentation:
1. Add a focused unit test with a fake auth client that emits the same user through `subscribe` immediately after `signInWithGoogle` resolves; fake progress client counts `load('users/{uid}')`; assert current count is 1 or document current duplicate count before any fix.
2. Add DEV-only counters: `progressHydrateStartedByUid`, `progressHydrateCompletedByUid`, and `progressHydrateInFlightByUid`, exposed only on `window.__eszsFirebaseDiagnostics` with no user email/display name.
3. Capture `performance.measure('auth-to-progress-ready')` from sign-in start to `progressStatus: ready` on Android release-like WebView.

Potential follow-up boundary, not implemented here:
- Dedupe `hydrateCloudProgress` by uid in `useAuthStore` or `firebaseProgress` with an in-flight promise map, preserving stale-user checks.

### H3 — Medium: ranking screen opens two simultaneous global RTDB listeners

Evidence:
- `Developer/r3f_prototype/src/components/UserRanking.jsx:31-42` subscribes both `daily` and `weekly` global rankings whenever the global ranking screen is mounted.
- `Developer/r3f_prototype/src/lib/firebaseRanking.js:291-297` maps global ranking subscriptions to `subscribeRankingWindow`.
- `Developer/r3f_prototype/src/lib/firebaseRanking.js:319-365` creates a real-time `mod.onValue` listener and a boundary timer.
- `Developer/r3f_prototype/src/lib/firebaseRanking.js:348-353` sets `unsubscribe = mod.onValue(...)` and `boundaryTimer = globalThis.setTimeout(subscribe, msUntilNextWindow(...))`.

Why it can hurt Galaxy A24/mobile:
- Opening global ranking creates two live ordered `limitToLast` RTDB queries at once.
- If the user opens ranking from game (`ReadyGameApp.jsx:99-104`, `ReadyGameApp.jsx:168-173`), game is not mounted while ranking is visible, but the phone still pays real-time/network/render cost for two boards.
- Rows are sorted client-side after `snap.forEach` in `firebaseRanking.js:367-375`; with the default `RANKING_LIMIT` this is bounded but still JS work on low-end devices.

Counter-evidence / bounds:
- Cleanup exists in `UserRanking.jsx:38-41`.
- `subscribeRankingWindow` cleanup closes `unsubscribe` and clears the boundary timer (`firebaseRanking.js:360-364`).
- Stage-specific ranking uses only one active-window subscription (`StageRanking.jsx:23-28`).

Safe instrumentation:
1. Fake `mod.onValue` in `firebaseRanking.test.js` to count active query listeners for `UserRanking` mount/unmount: expect 2 during global ranking, 0 after leaving.
2. DEV-only mark around `readRankingEntries` with row count and elapsed sort time, redacting uids/display names.
3. Android profile: open ranking from lobby and from game, record long tasks and WebView network sockets; compare one-window-only prototype vs current two-window view.

Potential follow-up boundary, not implemented here:
- Subscribe only the currently visible `activeWindow`, or lazy-load weekly after the tab is selected, if UX can tolerate first-open latency.

### H4 — Medium/Low: studio real-time listener is route-gated and cleaned up, but not relevant to Stage 1 players unless the route is entered

Evidence:
- `Developer/r3f_prototype/src/App.jsx:251-294` subscribes to `subscribeFirebaseStudio` only on `/graphics-studio` after signed-in master and remote-applied state.
- `Developer/r3f_prototype/src/lib/firebaseStudio.js:317-353` wraps RTDB `onValue` and returns an unsubscribe that flips an `active` flag and invokes Firebase unsubscribe.
- `Developer/r3f_prototype/src/lib/firebaseStudio.js:531-569` creates RTDB load/transaction/subscribe methods; subscribe calls `databaseModule.onValue` at lines 560-568.
- `Developer/r3f_prototype/src/App.jsx:296-299` performs a one-shot `hydrateCanonicalTitlePlayer({})` on normal non-admin game routes, not a real-time listener.

Why it can hurt Galaxy A24/mobile:
- Normal title/game loads still do one RTDB read of the canonical studio node (`firebaseStudio.js:297-315`) to apply public player tuning.
- If `hydrateCanonicalTitlePlayer` is slow or the canonical payload grows, it can add title-start network/JSON cost.

Counter-evidence / bounds:
- The actual studio real-time subscription is not active in normal gameplay.
- The normal-route canonical title path is a one-shot `load`, not `onValue`.
- The App route explicitly avoids graphics-studio subscription outside `/graphics-studio`.

Safe instrumentation:
1. DEV-only measure canonical title load duration/status from `App.jsx:296-299` and payload byte size after JSON stringify, excluding dataset contents.
2. Test fake studio client to assert normal game route calls no `subscribeFirebaseStudio` and graphics-studio route cleans unsubscribe on route/unmount.

Potential follow-up boundary, not implemented here:
- Cache only the small public player-tuning subset or split the canonical path if the whole studio snapshot becomes large.

### H5 — Medium/Low: top-level App window/BroadcastChannel handlers are permanent for the session

Evidence:
- `Developer/r3f_prototype/src/App.jsx:63-79` registers `window.addEventListener('message', ...)`, `window.addEventListener('load', ...)`, and `BroadcastChannel(...).addEventListener('message', ...)` at module scope.
- There is no `removeEventListener` or `BroadcastChannel.close()` because this code is outside React lifecycle.

Why it can hurt Galaxy A24/mobile:
- Production module evaluation should happen once, so this is not an accumulating leak in a normal AAB session.
- In dev/HMR or embedded reload edge cases, handlers/channels can accumulate.
- The BroadcastChannel handler runs on all non-studio routes and processes studio sync messages, though it returns quickly unless message shape matches.

Counter-evidence / bounds:
- This is not Firebase network overhead.
- It exists to support immediate Studio Apply sync and is mostly idle.
- Normal production WebView module lifetime is one app page lifetime.

Safe instrumentation:
1. DEV-only counter for `window.__eszsFirebaseDiagnostics.appGlobalMessageHandlers = 1` and BroadcastChannel message count.
2. HMR-specific test/manual check: reload module in dev and assert only one handler processes a synthetic sync message.

### H6 — Low: DEV playtest runtime logger can create 2-second network polling, but release/default builds should not enable it

Evidence:
- `Developer/r3f_prototype/src/lib/playtestLogger.js:15-16` gates runtime logging behind `import.meta.env.DEV && import.meta.env.VITE_PLAYTEST_LOGGING === '1'`.
- `Developer/r3f_prototype/src/lib/playtestLogger.js:129-145` emits a state log every 2000 ms when enabled.
- `Developer/r3f_prototype/src/lib/playtestLogger.js:156-174` sends each event to `/__playtest-log` via `fetch`/`sendBeacon`.
- `Developer/r3f_prototype/src/components/ReadyGameApp.jsx:42-44` initializes runtime utilities once.

Why it can hurt Galaxy A24/mobile:
- If accidentally enabled in a mobile test build, this is continuous network traffic and JSON serialization unrelated to Firebase.
- It can mask Firebase listener overhead during profiling.

Counter-evidence / bounds:
- It is DEV-only plus explicit env flag.
- Not a Firebase/Auth listener.

Safe instrumentation:
1. For any Galaxy A24 profiling run, record `import.meta.env.DEV` and `VITE_PLAYTEST_LOGGING` state in the test notes.
2. Assert release mobile build has no `/__playtest-log` network calls during a 5-minute idle/title/lobby/game smoke.

## Confirmed non-findings

- `firebaseProgress.js` uses one-shot RTDB `get/update/remove/runTransaction`; it does not install a progress `onValue` listener (`firebaseProgress.js:506-524`).
- `firebaseAuth.js` creates one `onAuthStateChanged` listener per auth client subscription and returns Firebase's unsubscribe (`firebaseAuth.js:136-141`). `useAuthStore` stores the unsubscribe globally and calls it before replacing (`useAuthStore.js:35-36`) and in test reset (`useAuthStore.js:99-103`).
- `subscribeFirebaseStudio` has both an `active` guard and unsubscribe forwarding (`firebaseStudio.js:331-352`).
- `subscribeInspectionMode` returns the Firebase unsubscribe from the client subscription (`firebaseInspectionMode.js:106-127`), and `App.jsx` handles both sync and async unsubscribe shapes (`App.jsx:103-129`).
- `subscribeRankingWindow` has an unmount cleanup that sets `closed`, calls `unsubscribe`, and clears `boundaryTimer` (`firebaseRanking.js:360-364`). It also checks `closed` after async client creation before installing an `onValue` (`firebaseRanking.js:338-341`).
- The regular game route does not subscribe to studio canonical updates; it only one-shot hydrates title player tuning (`App.jsx:296-299`, `firebaseStudio.js:297-315`).

## Recommended safe instrumentation order

1. Listener census test, no source behavior change:
   - Fake Firebase database module/client and count active RTDB listeners by path.
   - Scenarios: cold app mount on normal route, title→lobby→game, global ranking mount/unmount, stage ranking daily↔weekly, graphics-studio route mount/unmount, admin route mount/unmount.
   - Expected current counts to document:
     - normal app/game: `runtimeControl/v1/inspection` = 1
     - global ranking: +2 global ranking listeners while mounted
     - stage ranking: +1 stage ranking listener while mounted
     - graphics-studio: +1 canonical studio listener while mounted after ready/master
2. Hydration dedupe test:
   - Fake auth client emits same uid through both `signInWithGoogle` and `subscribe` callback.
   - Fake progress client counts `load(users/{uid})` and `save` calls.
   - This directly falsifies or confirms H2.
3. Android WebView performance marks:
   - `auth-signin-start`, `auth-state-user`, `progress-hydrate-start/end`, `inspection-subscribe`, `ranking-subscribe/unsubscribe`, `canonical-title-load-start/end`.
   - Export only counts/durations/status/paths, never uid/email/displayName/token.
4. A/B no-backend smoke:
   - Build/profile with Firebase database URL absent or fake no-op database client, compared with current env.
   - If Galaxy A24 slowdown persists unchanged, deprioritize Firebase listener root cause and hand off to graphics/runtime profiling.

## Suggested follow-up work, still respecting deferral boundaries

- If H1 is confirmed: create a UI/backend boundary task to decide whether inspection mode should be one-shot at boot, delayed until title idle, or kept real-time with explicit diagnostics.
- If H2 is confirmed: create a small backendmini task to add same-uid hydration in-flight dedupe and tests. This would not change Firebase schema/persistence/auth config.
- If H3 is confirmed as measurable: create a uimini/backendmini shared task to subscribe only to the active ranking tab on mobile.

## Audit result

Current code is not showing an obvious accumulating Firebase listener leak. The likely Firebase-related contributors to mobile overhead are:
1. Always-on inspection-mode RTDB listener during normal gameplay.
2. Possible duplicate progress hydration around Google sign-in.
3. Two simultaneous ranking listeners on global ranking screen.

All three are falsifiable with safe fake-client instrumentation and Android WebView performance marks without connecting to or mutating Firebase.
