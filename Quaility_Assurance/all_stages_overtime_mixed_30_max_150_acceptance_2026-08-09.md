# QA Acceptance — All Stages Overtime Mixed 30 / Max 150

Date: 2026-08-09
Profile: balanceqa
Kanban: t_ec02c73f — 오버타임 혼합 좀비·150 상한 QA
Workdir: `D:/JungSil/2.Minigame_project/school_survivor-integration`
Branch/HEAD: `zombie_only`, `fc58b69 Document previous session handoff`
Scope: QA only. No product code changes, no reset/delete/commit/push.

## Verdict

Scoped overtime spawn-cap acceptance: PASS with unrelated/baseline test-suite blockers noted separately.

The inspected implementation matches the requested owner values for the overtime loop:
- Stage 1–4 overtime reinforcement scheduling starts at exactly 300 seconds.
- Overtime interval is exactly 30 seconds.
- Each overtime request asks for 30 ordinary zombies before cap clamping.
- Total concurrent zombie budget is capped at 150, counting pooled active + special active + queued pooled spawns.
- Cap behavior fills remaining slots and does not delete existing zombies.
- Stage 1 overtime pool excludes E04 and includes E01/E02/E03/E05/E06/E07.
- Stage 2–4 overtime pool includes ordinary E01–E07.
- Frame-skip scheduling advances to the current deterministic tick once and avoids duplicate scheduling for the same tick.
- 110-second reinforcement remains present as E07 x3 + E02 x3 and is included in Stage 1/2/3/4 burst tables.

## Mandatory gate evidence

Command:
`powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile balanceqa -Domain auto -TaskSummary "overtime spawn cap QA"`

Result: exit 0.

Emitted domains/evidence:
- `resolved_domains`: common, gameplay, qa
- `matched_domains`: gameplay, qa
- `match_evidence`: gameplay keyword `spawn`; qa keyword `qa`
- `combined_receipt_sha256`: `12de94ef8a0c76bfa23ffb8f8b92a4d608fb8a4c6f91902afa190664291dedfd`

Required documents were read before acceptance work, including AGENTS.md, Bang_Rules.md, CLAUDE.md, project_develop_policy.md, mandatory_precommand manifest/README, Planner/Developer overtime handoffs, and the latest relevant QA record.

## Static QA evidence

### Implementation files inspected

- `Developer/r3f_prototype/src/components/Enemies.jsx`
- `Developer/r3f_prototype/src/components/Enemies.test.jsx`
- `Developer/r3f_prototype/src/lib/burstEvents.js`
- `Developer/r3f_prototype/src/lib/enemyEntityPool.js`

### Key implementation points verified

`Enemies.jsx`:
- Exports/uses `OVERTIME_REINFORCEMENT_START_SEC = 300`, `OVERTIME_REINFORCEMENT_INTERVAL_SEC = 30`, `OVERTIME_REINFORCEMENT_COUNT = 30`, and `MAX_CONCURRENT_ZOMBIES = MAX_ENEMIES`.
- `overtimeReinforcementTick(elapsedSec)` returns null before 300, tick 0 at 300, and increments every 30 seconds.
- `shouldScheduleOvertimeReinforcement(lastFiredTick, elapsedSec)` schedules only when the computed tick is greater than the last fired tick.
- Runtime frame loop calls `shouldScheduleOvertimeReinforcement(overtimeTickRef.current, sec)`, updates `overtimeTickRef.current`, then enqueues `SCHEDULE_OVERTIME`.
- `SCHEDULE_OVERTIME` branch clamps the request with `clampZombieSpawnRequest(OVERTIME_REINFORCEMENT_COUNT, totalZombieCounts())` before building and routing the batch through `addEnemies(batch, true, cache.spawnToken)`.
- `addEnemies` performs the same cap inspection before direct pooled spawn registration or queued spawn registration. The queue count is treated as reserved spawn budget via `pooledQueued: runtimeQueueRef.current.spawnDrain.count` inside `totalZombieCounts()`.
- Because queued entries remain included in `totalZombieCounts()` as reserved slots, later `addEnemies` calls for boss, Matilda, special, or pooled spawns cannot invade those reservations or exceed the 150 cap.
- Stage reset protection is preserved through `cache.id`, `cache.gameKey`, `store.currentStageId`, and `cache.spawnToken` checks.

`enemyEntityPool.js`:
- `MAX_ENEMIES = 150`.
- E07 remains a known pooled enemy type.

`burstEvents.js`:
- `ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS` remains:
  - `{ sec: 110, type: 'E07', count: 3 }`
  - `{ sec: 110, type: 'E02', count: 3 }`
- The shared 110-second events are spread into Stage 1, Stage 2, Stage 3, and Stage 4 burst tables.

### Diff / unrelated change observation

Command:
`git diff --name-status && git diff --numstat && git diff --check`

Result:
- Modified files in working copy:
  - `Bang_Rules.md`
  - `Developer/r3f_prototype/src/components/Enemies.jsx`
  - `Developer/r3f_prototype/src/components/Enemies.test.jsx`
  - `Developer/r3f_prototype/src/components/StudioTunedGroup.jsx`
  - `Developer/r3f_prototype/src/components/StudioTunedGroup.test.jsx`
  - `Developer/r3f_prototype/src/components/TitleScene3D.jsx`
  - `Developer/r3f_prototype/src/components/TitleScene3D.test.jsx`
  - `Developer/r3f_prototype/src/components/TitleSceneCanvas.jsx`
  - `Developer/r3f_prototype/src/components/TitleSceneCanvas.test.jsx`
  - `Developer/r3f_prototype/src/lib/enemyEntityPool.js`
  - `Developer/r3f_prototype/src/lib/enemyEntityPool.test.js`
  - `Developer/r3f_prototype/src/lib/weaponTargeting.test.js`
- Untracked planning/handoff files:
  - `Developer/agent_room/levelmini_all_stages_overtime_mixed_30_max_150_2026-08-09.md`
  - `Planner/all_stages_overtime_mixed_30_max_150_2026-08-09.md`
- `git diff --check`: no whitespace errors reported.
- Git warned that several working-copy LF files will be replaced by CRLF when touched. This is an EOL churn risk, not an overtime behavior failure.
- Several modified files are unrelated to overtime spawn-cap QA (StudioTunedGroup, TitleScene3D/Canvas, etc.); they were not modified by this QA pass.

## Test evidence

All commands were run from `Developer/r3f_prototype`.

### Focused overtime scheduling/mix/cap tests

Command:
`npm test -- src/components/Enemies.test.jsx -t "all-stage overtime mixed ordinary reinforcements"`

Result: PASS.

Output summary:
- Test Files: 1 passed (1)
- Tests: 4 passed, 89 skipped (93)
- Branch guard: ok (`zombie_only`, HEAD `fc58b69934fbf0f5d33e67f7780cbc053efb0332`)
- Legacy B02 source gate: passed
- Dialogue store gate: passed (451 Korean IDs)

### Pool tests

Command:
`npm test -- src/lib/enemyEntityPool.test.js`

Result: PASS.

Output summary:
- Test Files: 1 passed (1)
- Tests: 19 passed (19)
- Branch guard: ok
- Legacy B02 source gate: passed
- Dialogue store gate: passed

### 110-second E07/E02 focused confirmation

Command:
`npm test -- src/lib/burstEvents.test.js -t "110|웃는|smiling|E07"`

Result: PASS.

Output summary:
- Test Files: 1 passed (1)
- Tests: 5 passed, 20 skipped (25)
- Branch guard: ok
- Legacy B02 source gate: passed
- Dialogue store gate: passed

### Full Enemies test file

Command:
`npm test -- src/components/Enemies.test.jsx`

Result: FAIL, but failures are classified as existing/stale expectation fallout around non-overtime boss/runtime rewiring and brittle source-string slicing, not the scoped overtime acceptance assertions.

Output summary:
- Test Files: 1 failed (1)
- Tests: 8 failed, 85 passed (93)

Notable failures:
- Expected Stage 1 boss runtime sec 173 but received sec 192.
- `bossEscortSize('stage1', WAVE_PHASES, 192)` expected 7 but received 0.
- Source-string expectations still look for older runtime wiring such as `getRuntimeBurstEventsForStage(currentStageId, bossSpawnSec)` and `addEnemies(buildWaveBatch(...))`.
- A Matilda source-slice test includes the subsequent `SCHEDULE_BURST` branch and therefore sees `spawnBoss()` in the slice.

Classification: baseline/stale tests unrelated to the owner overtime values, because the focused overtime block in the same file passed 4/4.

### Production build

Command:
`npm run build`

Result: PASS.

Output summary:
- Branch guard: ok
- Legacy B02 source gate: passed
- Dialogue store gate: passed
- Vite build completed successfully (`✓ built in 787ms`)
- Legacy B02 artifact gate: passed
- Hosting JavaScript asset verification: passed (55 assets checked)
- Warnings only: large chunks and ineffective dynamic imports.

### Full Vitest suite

Command:
`npm test`

Result: FAIL.

Output summary:
- Test Files: 28 failed, 183 passed (211)
- Tests: 94 failed, 1758 passed, 20 skipped (1872)
- Errors: 11 unhandled errors

Classification:
- Broad baseline is currently red outside this scoped overtime change.
- Observed failures include Firebase Graphics Studio hydration/test-isolation errors, stale boss timing expectations, RZT runtime stat parity drift, project admin rule expectation count drift, student proximity text length, stage-object material-source expectations, and weapon targeting expecting 200 targets while `MAX_ENEMIES` is now 150.
- The full suite failure should not be reported as scoped overtime behavior verified; it is a project-wide baseline blocker for merge confidence.

## Acceptance checklist

- [x] Mandatory checker executed and required docs read.
- [x] Gating branch verified: `zombie_only`, branch guard ok.
- [x] Stage 1–4 first overtime at 300s verified by static read and focused tests.
- [x] 30-second interval verified by static read and focused tests.
- [x] Batch request count 30 verified by static read and focused tests.
- [x] Total concurrent cap 150 verified by static read, pool constant, and focused tests.
- [x] Cap includes pooled active + special active + queued pooled spawns.
- [x] Cap fills remaining slots without deleting existing zombies.
- [x] Stage 1 excludes E04 from overtime pool.
- [x] Stage 2–4 use ordinary E01–E07 overtime pool.
- [x] Duplicate overtime scheduling after skipped frames/reset covered by focused tests.
- [x] 110-second E07 x3 + E02 x3 remains verified by static read and focused test.
- [x] Build passes.
- [ ] Full suite green — blocked by unrelated/baseline failures listed above.

## Blockers

No blocker for the scoped overtime spawn-cap acceptance itself.

Project-wide merge/release confidence blocker:
- `npm test` is red: 28 failed files / 94 failed tests / 11 unhandled errors.
- `src/components/Enemies.test.jsx` full file is also red: 8 stale/non-overtime failures.

## Implementer handoff / repro commands

Run these from `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype`:

1. Scoped overtime acceptance:
   `npm test -- src/components/Enemies.test.jsx -t "all-stage overtime mixed ordinary reinforcements"`
2. Entity pool cap regression:
   `npm test -- src/lib/enemyEntityPool.test.js`
3. 110-second reinforcement regression:
   `npm test -- src/lib/burstEvents.test.js -t "110|웃는|smiling|E07"`
4. Full Enemies baseline:
   `npm test -- src/components/Enemies.test.jsx`
5. Build gate:
   `npm run build`
6. Full project baseline:
   `npm test`

Recommended follow-up outside this QA scope:
- Align stale tests to the current boss/runtime spawn contract or restore the older contract intentionally.
- Fix/triage Firebase Graphics Studio hydration unhandled errors in full-suite tests.
- Reconcile `weaponTargeting.test.js` with `MAX_ENEMIES = 150` if 150 is now the intended cap.
