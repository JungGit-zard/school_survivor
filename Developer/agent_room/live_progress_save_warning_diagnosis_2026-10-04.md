# Live progress save warning diagnosis - 2026-10-04

Task: Kanban `t_2f91fce5` — diagnose live game progress save warning.

## Scope and safety

- Read-only against live service.
- Did not mutate Firebase data, browser storage, D recovery files, or live hosting.
- Did not run an authenticated browser session because this worker has no confirmed reusable logged-in game session/token. See blocker below.

## Mandatory pre-command gate

Checker command used safe summary `live progress save warning backend diagnosis`.

- Profile: `backendmini`
- Resolved domains: `common`, `backend`
- Matched domains: `backend`
- Match evidence: keyword `backend`
- Combined receipt SHA-256: `e037d5741046197dd5d1a423b3103115c9c860264523c4665fefcc78239ad4d5`

All emitted required docs were read. `SESSION_MEMORY.md` was read according to the required latest-entry-only rule.

## Live evidence collected

### Live bundle warning UI

`https://escapezombie.com/assets/HUD-E0Anvlra.js`

- Contains `data-testid="progress-save-warning"`.
- Title text: `저장할 수 없습니다`.
- Message text: `게임은 계속 진행됩니다. 인터넷 연결을 확인해 주세요.`

This confirms the user-visible warning is the generic save-failure warning, not Graphics Studio UI.

### Live save implementation swallows exact Firebase error

`https://escapezombie.com/assets/firebaseProgress-CPiHOo9f.js`

Relevant live logic:

- `requestCloudProgressSave` uses `update(ref(path), payload)`.
- Any save exception falls into `.catch(() => ({ saved:false, shouldWarn:true }))`.
- It then marks pending warning as `save-failed`.

Source counterpart:

- `Developer/r3f_prototype/src/lib/firebaseProgress.js:411-429`
- `Developer/r3f_prototype/src/store/useGameStore.js:217-228`

Conclusion: the live client intentionally discards the exact backend error code, so HUD can only show the generic internet-advice warning.

### Live deployed rules match repository rules

Read-only command:

```bash
MSYS_NO_PATHCONV=1 firebase -P escape-zombie-school database:get /.settings/rules --instance escape-zombie-school-default-rtdb --pretty
```

Normalized JSON comparison against `Developer/r3f_prototype/database.rules.json`:

```text
local_sha256 6a55b1387c209d703c8eaf454681f194ed88082693d6370392142e181962971a
live_sha256  6a55b1387c209d703c8eaf454681f194ed88082693d6370392142e181962971a
rules_equal True
```

So the deployed backend rules are exactly the repository rules.

### Exact rule/source mismatch found

Repository source allows the live game to record `E08` encounters:

- `Developer/r3f_prototype/src/lib/zombieEncyclopedia.js:8-25` includes `E08: '코인 몬스터'`.
- `Developer/r3f_prototype/src/lib/zombieEncyclopedia.js:65-77` writes `progress.encounteredZombieTypes[type] = 1` and calls `requestCloudProgressSave()`.
- `Developer/r3f_prototype/src/lib/enemyEntityPool.js:28-30` includes `E08` in `ENEMY_TYPE_NAMES`.
- `Developer/r3f_prototype/src/lib/burstEvents.js:64-69` spawns `E08` at 90s and 180s in every stage.

Live bundle confirms the same:

- `https://escapezombie.com/assets/burstEvents-BTgG8uHd.js` contains `sec:90,type:'E08'` and `sec:180,type:'E08'` with `rewardEvent:'coinMonster'`.
- `https://escapezombie.com/assets/GameCanvas-D2Pkre31.js` contains `E08:'코인 몬스터'` and save path that records the encounter and calls the save function.

But live/repo Realtime Database rules allow only:

```text
E01,E02,E03,E04,E05,E06,E07,RZL,RZC,RZT,RZG,B01,B02,B03,B04
```

They do not allow `E08` under:

```text
users/$uid/progress/encounteredZombieTypes/$zombieType
```

Verification command output:

```text
source_zombie_encyclopedia_types B01,B02,B03,B04,E01,E02,E03,E04,E05,E06,E07,E08,RZC,RZG,RZL,RZT
rules_allowed_encounter_types B01,B02,B03,B04,E01,E02,E03,E04,E05,E06,E07,RZC,RZG,RZL,RZT
types_in_source_not_rules E08
types_in_rules_not_source (none)
```

Live rules check:

```text
live_rules_encounter_allows_E08 False
```

### Read-only live data spot check

Read-only command against `/users` found:

```text
users_total 9
users_with_progress_encountered_E08 0
users_missing_top_level_save_shape 0
```

This is consistent with the failure mode: once `E08` is added locally to the save payload, the rules reject the full `update(users/{uid}, payload)`, so `E08` never persists and the HUD warning appears.

## Diagnosis

Most likely exact backend cause:

1. Authenticated gameplay spawns `E08` at 90s/180s.
2. The live client records the encounter into `users/{uid}/progress/encounteredZombieTypes/E08 = 1`.
3. The live client saves the whole user snapshot with `update(users/{uid}, payload)`.
4. Live Realtime Database rules reject `encounteredZombieTypes/E08` because `E08` is missing from the allowlist.
5. The client catches the backend exception without preserving the Firebase error code and sets the generic HUD warning `save-failed`.

Expected backend/network error for an authenticated session at that moment is a Realtime Database permission/validation rejection, surfaced by Firebase Web SDK as a save exception and hidden by the generic catch.

## Minimal likely fix boundary, not applied in this card

Do not change gameplay or Graphics Studio. The narrow backend fix is to add `E08` to the Realtime Database rule allowlist for `users/$uid/progress/encounteredZombieTypes/$zombieType`, then deploy rules and verify with an authenticated live run past 90s.

A second improvement is diagnostic-only: preserve/log the Firebase error code inside `requestCloudProgressSave` so the HUD or console can distinguish permission/rules failures from network loss. That is not required to stop the warning if the rule allowlist is fixed.

## Blocker for full acceptance

The card requested authenticated session network/error evidence. This worker could not safely collect it because no confirmed authenticated live game browser session or user ID token was available, and the task explicitly forbids mutating browser storage or live service. The live rule/source evidence above is sufficient to identify the likely exact backend cause, but final acceptance should include one logged-in read-only browser/network capture around the 90s `E08` spawn or an approved authenticated token-based reproduction.
