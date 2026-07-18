# Google Login Secure Cloud Save Implementation TODO

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add Google login and server-owned external progress storage so coins, passive skill levels, weapon unlocks, and records are account-bound and not trusted from `localStorage`.

**Architecture:** Use Firebase Auth for Google login, Firestore for user progress documents, and Cloud Functions for trusted economy writes. The React game reads progress from a storage adapter, while coin rewards and passive purchases are executed by server functions.

**Tech Stack:** React, Vite, Zustand, Firebase Auth, Cloud Firestore, Cloud Functions for Firebase, Firebase App Check, Vitest.

---

## File Structure

- Create: `Developer/r3f_prototype/src/lib/firebaseClient.js`
  - Initializes Firebase client SDK from Vite environment variables.
- Create: `Developer/r3f_prototype/src/lib/authSession.js`
  - Wraps Google sign-in, sign-out, and current auth state subscription.
- Create: `Developer/r3f_prototype/src/lib/remoteProgress.js`
  - Subscribes to `userProgress/{uid}` and calls Cloud Functions.
- Create: `Developer/r3f_prototype/src/lib/progressDefaults.js`
  - Defines default progress shape shared by local fallback tests and UI.
- Modify: `Developer/r3f_prototype/src/App.jsx`
  - Gates permanent gameplay behind authenticated progress load.
- Modify: `Developer/r3f_prototype/src/components/TitleScreen.jsx`
  - Adds Google login status and login button.
- Modify: `Developer/r3f_prototype/src/components/CoinShop.jsx`
  - Buys passives through the store action that calls the server.
- Modify: `Developer/r3f_prototype/src/store/useGameStore.js`
  - Replaces direct trusted `localStorage` writes with progress adapter calls.
- Create: `Developer/r3f_prototype/firebase.json`
  - Firebase project config for functions/firestore rules.
- Create: `Developer/r3f_prototype/firestore.rules`
  - Allows own-user reads, denies direct trusted progress writes.
- Create: `Developer/r3f_prototype/functions/package.json`
  - Functions package dependencies and scripts.
- Create: `Developer/r3f_prototype/functions/src/index.js`
  - Callable functions: `finishRun`, `purchasePassive`, development reset if needed.
- Create tests:
  - `Developer/r3f_prototype/src/lib/authSession.test.js`
  - `Developer/r3f_prototype/src/lib/remoteProgress.test.js`
  - `Developer/r3f_prototype/src/store/useGameStore.cloudProgress.test.js`
  - `Developer/r3f_prototype/functions/src/index.test.js`

## Environment Variables

Add a local-only `.env.local` file during development. Do not commit real values.

```txt
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_APP_CHECK_SITE_KEY=
```

Commit only a safe example file:

- Create: `Developer/r3f_prototype/.env.example`

## Task 1: Firebase Project Setup

- [ ] Create a Firebase project for the game.
- [ ] Enable Firebase Authentication.
- [ ] Enable Google sign-in provider.
- [ ] Add the web app in Firebase console.
- [ ] Enable Cloud Firestore.
- [ ] Enable Cloud Functions.
- [ ] Enable App Check for the web app.
- [ ] Copy safe environment variable names into `.env.example`.
- [ ] Keep real Firebase keys in `.env.local` only.

Validation:

- [ ] `npm run build` must not require committed secret values.
- [ ] The app should show a clear configuration error in development if required env values are missing.

## Task 2: Add Firebase Client SDK

- [ ] Install dependencies in `Developer/r3f_prototype`.

```powershell
npm install firebase
```

- [ ] Create `src/lib/firebaseClient.js`.
- [ ] Export initialized `app`, `auth`, `db`, `functions`.
- [ ] Initialize App Check only when `VITE_FIREBASE_APP_CHECK_SITE_KEY` exists.
- [ ] Add tests that mock missing env values and confirm a readable error path.

Validation:

```powershell
npm test -- firebaseClient
npm run build
```

## Task 3: Auth Session Layer

- [ ] Create `src/lib/authSession.js`.
- [ ] Implement `signInWithGoogle()`.
- [ ] Implement `signOutUser()`.
- [ ] Implement `subscribeAuthState(callback)`.
- [ ] Return normalized user info: `uid`, `displayName`, `email`, `photoURL`.
- [ ] Add `src/lib/authSession.test.js` with Firebase SDK mocks.

Acceptance:

- [ ] Logged-out title screen can show "Google login required".
- [ ] Logged-in title screen can show profile name or email.
- [ ] Sign-out returns the app to non-permanent-progress mode.

## Task 4: Progress Defaults and Shape

- [ ] Create `src/lib/progressDefaults.js`.
- [ ] Define `DEFAULT_PROGRESS`.
- [ ] Include keys for `goldTotal`, `passiveUpgrades`, `weaponUnlocks`, and `records`.
- [ ] Reuse current record keys from `src/lib/playerRecords.js`.
- [ ] Reuse passive ids from `src/lib/passiveCatalog.js`.
- [ ] Reuse weapon ids from `src/lib/weaponCatalog.js`.

Acceptance:

- [ ] Old missing fields default to 0 or false.
- [ ] Unknown future fields are not shown in UI, but server data can preserve them.

## Task 5: Remote Progress Client

- [ ] Create `src/lib/remoteProgress.js`.
- [ ] Implement `subscribeUserProgress(uid, onProgress, onError)`.
- [ ] Implement `finishRun(runSummary)`.
- [ ] Implement `purchasePassive(passiveId)`.
- [ ] Implement `ensureUserProfile(user)`.
- [ ] Add tests with mocked Firestore and Functions APIs.

Acceptance:

- [ ] The client never directly writes `goldTotal`.
- [ ] The client never directly writes `passiveUpgrades`.
- [ ] The client never directly writes `weaponUnlocks`.
- [ ] The client only calls server functions for trusted changes.

## Task 6: Zustand Store Integration

- [ ] Modify `src/store/useGameStore.js`.
- [ ] Add `progressSource: 'none' | 'cloud'`.
- [ ] Add `cloudProgressReady: boolean`.
- [ ] Add `applyRemoteProgress(progress)`.
- [ ] Change `goldTotal` initialization to use cloud progress after login.
- [ ] Change `purchasePassive(id)` to call `remoteProgress.purchasePassive(id)` when logged in.
- [ ] Change `_onRunEnd(phaseName)` to call `remoteProgress.finishRun(...)` when logged in.
- [ ] Keep runtime-only values local: HP, XP, current run kills, elapsed time, current weapons during a run.
- [ ] Add tests in `useGameStore.cloudProgress.test.js`.

Acceptance:

- [ ] Editing localStorage does not change store values after cloud progress loads.
- [ ] Buying passive with insufficient cloud coins fails.
- [ ] Run end sends one `finishRun` request.
- [ ] Duplicate local result handling does not increment coins twice in the client.

## Task 7: Title Screen Login UI

- [ ] Modify `src/components/TitleScreen.jsx`.
- [ ] Add Google login button when logged out.
- [ ] Disable or hide `게임 시작` until authenticated progress is ready.
- [ ] Show a short loading state while progress loads.
- [ ] Show a retry state if progress load fails.
- [ ] Keep development cheat buttons visually separate.
- [ ] Add tests in `TitleScreen.settings.test.jsx` or a new `TitleScreen.auth.test.jsx`.

Acceptance:

- [ ] Logged-out user cannot start a permanent run.
- [ ] Logged-in user can start after progress loads.
- [ ] Error state does not silently fall back to trusted local progress.

## Task 8: Coin Shop Server Purchase Flow

- [ ] Modify `src/components/CoinShop.jsx`.
- [ ] Show cloud `goldTotal`.
- [ ] Disable buy buttons while a purchase request is pending.
- [ ] Show server error messages for max level, insufficient coins, and unknown passive id.
- [ ] Remove direct dependency on `getLevel()` reading localStorage once cloud progress is active.

Acceptance:

- [ ] Passive card levels match cloud progress.
- [ ] Clicking buy calls the store action once.
- [ ] UI updates only after server progress snapshot returns or Firestore subscription updates.

## Task 9: Cloud Functions

- [ ] Create `functions/src/index.js`.
- [ ] Implement `finishRun`.
- [ ] Implement `purchasePassive`.
- [ ] Use Firestore transactions for progress updates.
- [ ] Keep server-side copies of price, max level, stage cap, and unlock rules.
- [ ] Reject unauthenticated calls.
- [ ] Reject duplicate `runId`.
- [ ] Reject impossible run values.
- [ ] Write run audit logs under `userRuns/{uid}/runs/{runId}`.
- [ ] Add unit tests for each rejection and success path.

Suggested first-pass validation rules:

- `survivalSeconds` must be between 0 and the stage clear target plus a small tolerance.
- `kills` must be a non-negative integer.
- `earnedGold` must be a non-negative integer and below the stage/run cap.
- `levelUps` must be a non-negative integer and below a practical run cap.
- `stageId` must exist in the server-side stage catalog.
- `result` must be `gameover` or `cleared`.

## Task 10: Firestore Security Rules

- [ ] Create `firestore.rules`.
- [ ] Allow signed-in users to read `users/{uid}` and `userProgress/{uid}` only when `request.auth.uid == uid`.
- [ ] Allow profile-safe writes only for `users/{uid}`.
- [ ] Deny all client writes to `userProgress/{uid}`.
- [ ] Deny all client writes to `userRuns/{uid}/runs/{runId}`.
- [ ] Add emulator tests if Firebase Emulator Suite is added.

Acceptance:

- [ ] Client cannot write `goldTotal`.
- [ ] Client cannot write passive levels.
- [ ] Client cannot write weapon unlocks.
- [ ] Cloud Functions can update progress through Admin SDK.

## Task 11: Migration and Local Storage Policy

- [ ] Do not automatically upload existing localStorage progress.
- [ ] On first login, create new server progress with safe defaults.
- [ ] Keep `titleSettings` local because it is not trusted economy state.
- [ ] Remove or disable title cheat buttons from production builds, or restrict them to development-only cloud reset functions.

Acceptance:

- [ ] Existing hacked localStorage cannot become cloud progress.
- [ ] A new account starts from default progress.
- [ ] Settings such as reduced effects can remain local.

## Task 12: QA and Security Verification

- [ ] Add a QA checklist under `Quaility_Assurance/` before implementation is marked complete.
- [ ] Test logged-out state.
- [ ] Test Google login success.
- [ ] Test progress loading.
- [ ] Test finish run coin award.
- [ ] Test passive purchase.
- [ ] Test insufficient coin purchase.
- [ ] Test duplicate run submission.
- [ ] Test localStorage tampering after login.
- [ ] Test Firestore direct write denial.
- [ ] Test production build without `.env.local`.

Commands:

```powershell
npm test
npm run build
firebase emulators:start
firebase deploy --only functions,firestore:rules
```

## Recommended Commit Plan

- [ ] Commit 1: Firebase client config and auth session wrapper.
- [ ] Commit 2: Remote progress adapter and default progress model.
- [ ] Commit 3: Store integration with cloud progress.
- [ ] Commit 4: Title login UI and logged-out gate.
- [ ] Commit 5: Coin shop cloud purchase flow.
- [ ] Commit 6: Cloud Functions for `finishRun` and `purchasePassive`.
- [ ] Commit 7: Firestore rules and security tests.
- [ ] Commit 8: QA documentation and final cleanup.

