# Google Login Secure Cloud Save Design

Date: 2026-06-14

## Goal

Google account login must connect each player's permanent progress to an external backend so that coins, passive skill levels, weapon unlocks, and records cannot be changed by editing browser `localStorage`.

## Current Project State

The current prototype is a Vite/React/Three.js game. Permanent progress is stored locally in the browser.

- Coins: `school_survivor:goldTotal`
- Passive levels: `school_survivor:passiveUpgrades`
- Weapon unlocks: `school_survivor:weaponUnlocks`
- Player records: `school_survivor:playerRecords`
- Title settings and development cheats: `school_survivor:titleSettings`

Local storage is useful for prototypes, but it is not trusted storage. Any player can edit it from browser developer tools.

## Decision

Use Firebase as the first production backend.

- Authentication: Firebase Authentication with Google provider.
- External data store: Cloud Firestore.
- Trusted server logic: Cloud Functions for Firebase.
- Access control: Firestore Security Rules.
- Abuse reduction: Firebase App Check.

Firebase is recommended because this game currently needs user-owned JSON-like progress documents, not a custom high-scale multiplayer backend. Cloud Functions are still required because the client must not directly write trusted economy values.

Official references:

- Firebase Authentication: https://firebase.google.com/docs/auth
- Cloud Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Callable Cloud Functions: https://firebase.google.com/docs/functions/callable
- Firebase App Check: https://firebase.google.com/docs/app-check

## Security Principle

The client may request an action, but the server decides whether the action is valid.

The client must not directly write:

- `goldTotal`
- `passiveUpgrades`
- `weaponUnlocks`
- `records`

The client may read its own progress document after login. All trusted writes must go through Cloud Functions.

## Login Policy

Online Google login is required for permanent progress.

- If the player is not logged in, the game may show the title screen and login UI.
- Coin gain, passive purchases, weapon unlocks, and permanent records are saved only for authenticated users.
- Guest-to-account merge is intentionally excluded from the first version because it creates exploitable migration rules.

## Proposed Data Model

```txt
users/{uid}
  displayName
  email
  photoURL
  createdAt
  lastLoginAt

userProgress/{uid}
  goldTotal
  passiveUpgrades
    magnet
    might
    maxHp
    moveSpeed
    growth
  weaponUnlocks
    guidedMissile
    starlink
    compassBlade
    umbrellaGuard
    eraserBomb
  records
    totalRuns
    totalKills
    totalGold
    totalSurvivalSeconds
    bestSurvivalSeconds
    stage1Clears
    stage1Survival180Runs
    stage2Clears
    stage2BestSurvivalSec
    bossKills
    totalLevelUps
    totalPickups
    weaponMasterCount
  updatedAt

userRuns/{uid}/runs/{runId}
  stageId
  result
  survivalSeconds
  kills
  earnedGold
  levelUps
  createdAt
  validationStatus
```

## Trusted Server Actions

### `finishRun`

Called once when a run ends by game over or stage clear.

Input:

```json
{
  "runId": "client-generated-uuid",
  "stageId": "stage1",
  "result": "gameover",
  "survivalSeconds": 178,
  "kills": 80,
  "earnedGold": 12,
  "levelUps": 5
}
```

Server responsibilities:

- Require authenticated Firebase user.
- Reject duplicate `runId`.
- Clamp or reject impossible values.
- Apply stage-specific maximum survival time.
- Apply per-run gold upper bound.
- Update `userProgress/{uid}` in a transaction.
- Recalculate weapon unlocks from trusted cumulative records.
- Store a run audit record under `userRuns/{uid}/runs/{runId}`.

### `purchasePassive`

Called when the player buys a passive upgrade in the coin shop.

Input:

```json
{
  "passiveId": "magnet"
}
```

Server responsibilities:

- Require authenticated Firebase user.
- Load current trusted progress.
- Validate passive id against the server-side passive catalog.
- Validate max level and price.
- Subtract coins and increment passive level in a transaction.
- Return the updated progress snapshot.

### `resetDevProgress`

Development-only function for testing.

Server responsibilities:

- Require authenticated user.
- Allow only development builds or allowlisted tester UIDs.
- Reset progress to a known safe state.

## Firestore Rule Shape

Rules should allow a signed-in user to read their own documents, but deny direct writes to trusted progress.

Conceptual rule:

```txt
users/{uid}
  read: request.auth.uid == uid
  create/update: request.auth.uid == uid, only profile-safe fields

userProgress/{uid}
  read: request.auth.uid == uid
  write: false

userRuns/{uid}/runs/{runId}
  read: request.auth.uid == uid
  write: false
```

Cloud Functions use Firebase Admin privileges and are not limited by client Firestore rules.

## Client Data Flow

1. Title screen shows Google login.
2. After login, the client subscribes to `userProgress/{uid}`.
3. The game store uses remote progress as the source of truth for gold, passive levels, weapon unlocks, and records.
4. During a run, temporary values such as current HP, XP, elapsed time, and current weapons remain local runtime state.
5. When the run ends, the client calls `finishRun`.
6. When the player buys a passive, the client calls `purchasePassive`.
7. Firestore subscription updates the UI after server writes.

## Anti-Cheat Boundary

This plan prevents simple storage tampering. It does not make the whole game impossible to cheat.

Protected:

- Editing `localStorage` cannot increase permanent coins.
- Editing `localStorage` cannot increase passive levels.
- Editing `localStorage` cannot unlock server-owned weapons.
- Replaying the same run result with the same `runId` cannot pay twice.

Still possible without deeper server simulation:

- A modified client can lie about run results.
- A modified client can automate repeated valid-looking runs.

First-version mitigation:

- Per-run caps.
- Duplicate run protection.
- Stage duration bounds.
- Rate limits.
- App Check.
- Audit logs in `userRuns`.

Future mitigation:

- Server-side score anomaly detection.
- Signed run sessions.
- Input/replay validation for ranked modes.
- Separate stricter rules for public leaderboard scores.

## First Milestone Scope

The first milestone should ship only:

- Google login.
- Remote user progress load.
- Server-owned coin total.
- Server-owned passive purchases.
- Server-owned weapon unlock state.
- Server-owned player records.
- No guest merge.
- No public leaderboard yet.
- No multiplayer or real-time interaction between users.

