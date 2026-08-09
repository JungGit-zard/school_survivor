# Fixed-only zombie spawn runtime scoped review — 2026-08-09

## Scope
- Kanban: `t_b61e8050` — Review fixed-only zombie spawn runtime after `t_f3b96465`.
- Review type: scoped static diff/source review only.
- User constraints followed: no tests, no build, no browser, no commit, no source edits.
- Source commit reviewed: `8df91f782b7e716cd41fd7c8be1c5e5c6e6a32dd` (`Remove random zombie wave spawning`).

## Required-document gate
Command:
```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile balanceqa -Domain auto -TaskSummary 'fixed zombie spawn runtime scoped diff review'
```
Result:
- Exit code: 0
- `matched_domains`: `gameplay`, `qa`
- `match_evidence`: `spawn`, `review`
- `combined_receipt_sha256`: `7435afde26a69f65469afbf76bfccac2a89f1e14eabeeeddf9b818f4fcbea160`

## Commands and results
1. Kanban orientation:
```text
kanban_show(task_id='t_b61e8050')
```
Result: task status `running`; acceptance explicitly forbids tests/build/browser and says inspect only scoped diff.

2. gstack and workspace state:
```bash
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
printf '\n--- git status ---\n'
git status --short --branch
printf '\n--- diff stat ---\n'
git diff --stat -- Developer/r3f_prototype/src/components/Enemies.jsx Developer/r3f_prototype/src/lib/burstEvents.js Developer/r3f_prototype/src/components/Enemies.test.jsx
```
Result:
```text
GSTACK_OK

--- git status ---
## zombie_only...origin/zombie_only [ahead 1]
 M Developer/r3f_prototype/src/components/Enemies.jsx
 M Developer/r3f_prototype/src/components/ReadyGameApp.jsx
 M Developer/r3f_prototype/src/lib/matildaSpec.test.js
 M Developer/r3f_prototype/src/lib/studentProximity.test.js
 M Developer/r3f_prototype/src/store/useGameStore.test.js
?? Developer/r3f_prototype/tmp-dialogue-lengths.mjs
?? Developer/threemini_stage2_guard_chase_visible_bounds_2026-08-09.md
?? Developer/threemini_stage2_guard_zombie_far_lod_fix_2026-08-09.md
?? Graphic_designer/threemini_stage2_guard_chase_visible_screen_record_2026-08-09.md
?? Graphic_designer/threemini_stage2_guard_zombie_far_lod_graphics_record_2026-08-09.md
?? Planner/levelmini_stage2_red_charger_go_runtime_fix_2026-08-09.md
?? Planner/levelmini_stage3_running_crew_six_followers_2026-08-09.md

--- diff stat ---
 Developer/r3f_prototype/src/components/Enemies.jsx | 5 ++---
 1 file changed, 2 insertions(+), 3 deletions(-)
```
Observation: workspace already contains unrelated dirty files. This QA pass did not edit source/title/runtime files; only this QA record was added.

3. Reviewed current uncommitted scoped diff in `Enemies.jsx`:
```bash
git diff -- Developer/r3f_prototype/src/components/Enemies.jsx
```
Result: only comments around `stageBurstJarmobBaseHp` changed; no runtime behavior change.

4. Reviewed scoped commit paths:
```bash
git show --name-only --format='' HEAD -- Developer/r3f_prototype/src/components/Enemies.jsx Developer/r3f_prototype/src/lib/burstEvents.js Developer/r3f_prototype/src/lib/stageConfig.js Developer/r3f_prototype/src/store/useGameStore.js
```
Result:
```text
Developer/r3f_prototype/src/components/Enemies.jsx
Developer/r3f_prototype/src/lib/burstEvents.js
Developer/r3f_prototype/src/lib/stageConfig.js
Developer/r3f_prototype/src/store/useGameStore.js
```
No unrelated/title files are in the reviewed commit path set.

5. Forbidden-token scan in scoped HEAD files:
```bash
git grep -n -E 'SCHEDULE_WAVE|SCHEDULE_MID_WAVE|buildWaveBatch|function pickTypeByWeight\(|rollBossSpawnSec\(random|BOSS_SPAWN_JITTER_SEC = [1-9]|bossEscortSize\([^)]|getRuntimeBurstEventsForStage\([^)]*,|Math\.random\(\).*boss|random.*boss|jitter.*boss' -- Developer/r3f_prototype/src/components/Enemies.jsx Developer/r3f_prototype/src/lib/burstEvents.js Developer/r3f_prototype/src/lib/stageConfig.js Developer/r3f_prototype/src/store/useGameStore.js || true
```
Result: no matches.

6. Positive runtime hook scan:
```bash
git grep -n -E 'getRuntimeBurstEventsForStage\(currentStageId\)|SCHEDULE_BURST|bossSpawnSec: getBossSpawnSec|BOSS_SPAWN_JITTER_SEC = 0|return getBurstEventsForStage\(stageId\)|return bossSecs.length > 0 \? Math.min' -- Developer/r3f_prototype/src/components/Enemies.jsx Developer/r3f_prototype/src/lib/burstEvents.js Developer/r3f_prototype/src/lib/stageConfig.js Developer/r3f_prototype/src/store/useGameStore.js
```
Result:
```text
Developer/r3f_prototype/src/components/Enemies.jsx:930:const SCHEDULE_BURST = 5
Developer/r3f_prototype/src/components/Enemies.jsx:1040:      burstEvents: getRuntimeBurstEventsForStage(currentStageId),
Developer/r3f_prototype/src/components/Enemies.jsx:1326:    } else if (kind === SCHEDULE_BURST) {
Developer/r3f_prototype/src/components/Enemies.jsx:1483:      enqueueScheduled(SCHEDULE_BURST, burstIndex, sec)
Developer/r3f_prototype/src/lib/burstEvents.js:119:  return getBurstEventsForStage(stageId)
Developer/r3f_prototype/src/lib/burstEvents.js:127:  return bossSecs.length > 0 ? Math.min(...bossSecs) : Infinity
Developer/r3f_prototype/src/lib/stageConfig.js:8:export const BOSS_SPAWN_JITTER_SEC = 0
Developer/r3f_prototype/src/store/useGameStore.js:196:    bossSpawnSec: getBossSpawnSec(DEFAULT_STAGE_ID),
Developer/r3f_prototype/src/store/useGameStore.js:846:        bossSpawnSec: getBossSpawnSec(nextStageId),
```

## Source observations
- `Developer/r3f_prototype/src/components/Enemies.jsx`
  - Runtime cache uses `getRuntimeBurstEventsForStage(currentStageId)` only.
  - Runtime frame loop schedules only `SCHEDULE_BURST` for zombie/boss burst events.
  - Removed runtime `SCHEDULE_WAVE`, `SCHEDULE_MID_WAVE`, `nextWaveTimeRef`, `nextMidTimeRef`, `phaseIndexAtTime`, and `buildWaveBatch` paths are absent from the scoped HEAD files.
  - Boss branch spawns only the boss batch and no longer appends `bossEscortSize` / wave-built escort enemies.
- `Developer/r3f_prototype/src/lib/burstEvents.js`
  - `getRuntimeBurstEventsForStage(stageId)` returns `getBurstEventsForStage(stageId)` directly.
  - No two-argument runtime boss-second override remains.
  - `getBossSpawnSec(stageId)` derives the minimum boss `sec` from the explicit table.
- `Developer/r3f_prototype/src/lib/stageConfig.js`
  - `BOSS_SPAWN_JITTER_SEC = 0`.
  - `rollBossSpawnSec()` returns fixed `BOSS_SPAWN_CENTER_SEC` and is no longer used by `useGameStore` in the scoped diff.
- `Developer/r3f_prototype/src/store/useGameStore.js`
  - Initial and reset `bossSpawnSec` values come from `getBossSpawnSec(stageId)`, not random roll.

## Acceptance verdict
PASS for scoped static review.

- No random interval wave runtime scheduling found in the scoped HEAD files.
- No midpoint wave runtime scheduling found in the scoped HEAD files.
- No weighted random zombie type generation is used by runtime wave spawning in the scoped HEAD files; the removed `pickTypeByWeight` / `buildWaveBatch` path is absent.
- No automatic boss escort path found in runtime boss spawn handling.
- Boss spawn time has no random jitter in the runtime path reviewed; store derives boss time from explicit burst table values.
- Explicit fixed burst tables and user-set values were left intact in the reviewed scoped diff; runtime now consumes those explicit tables directly.
- Reviewed commit paths are limited to `Enemies.jsx`, `burstEvents.js`, `stageConfig.js`, and `useGameStore.js`; unrelated/title files were not part of the scoped commit.

## Blockers
None for this static acceptance scope.

## Observations / risks
- Tests/build/browser were intentionally not run because the task explicitly forbids them.
- Workspace contains pre-existing unrelated modified/untracked files. This review did not revert or modify them.
- Some existing tests outside this no-test scope still contain old text references such as boss escort/midpoint expectations, but they were not part of the accepted execution path and were not executed due to user constraint.
