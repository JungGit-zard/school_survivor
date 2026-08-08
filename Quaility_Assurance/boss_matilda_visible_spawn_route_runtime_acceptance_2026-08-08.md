# Boss/Matilda visible spawn route runtime acceptance QA — 2026-08-08

## Scope
- Kanban: `t_edadca99` — QA acceptance: all stage bosses and Matilda visible spawn route.
- Read-only acceptance review of current dirty workspace; no source/runtime logic changes made.
- Verified B01/B02/B03/B04 + Matilda visual routing, runtime boss events, Stage 2 B02 no-legacy gate, and focused tests.

## Required-document gate
Command:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile balanceqa -Domain auto -TaskSummary 'QA acceptance boss Matilda visible spawn route runtime boss events tests'
```
Result:
- Exit code: 0
- `matched_domains`: `gameplay`, `qa`
- `match_evidence`: `boss`, `qa`
- `combined_receipt_sha256`: `cb93aa8f6e37310de6452913c7ebcab144f9fe76c2a243db62fc99ae78951604`

## Evidence reviewed
- `Developer/r3f_prototype/src/lib/burstEvents.js`
  - `BOSS_BURST_TYPES = ['B01', 'B02', 'B03', 'B04']`.
  - Static boss events are exactly one boss per stage:
    - Stage 1: `{ sec: 192, type: 'B01', count: 1 }`
    - Stage 2: `{ sec: 120, type: 'B02', count: 1 }`
    - Stage 3: `{ sec: 135, type: 'B03', count: 1 }`
    - Stage 4: `{ sec: 140, type: 'B04', count: 1 }`
  - `getRuntimeBurstEventsForStage(stageId, bossSpawnSec)` maps boss events to the runtime chosen boss second; runtime check at `173` returned one boss event for each stage/type.
- `Developer/r3f_prototype/src/components/Enemies.jsx`
  - `isPooledEnemyType(type)` excludes all `isBossType(type)` entries, with comment documenting that current `stage2-boss-v2` B02 renders via `Enemy/ZombieMesh` because `ZombieInstanceLayer` has no boss body mesh.
  - Matilda grace scheduling path uses `SCHEDULE_MATILDA`; frame logic enqueues the scheduled spawn and scheduler gate waits for `canSpawnMatildaEntry(...)` before `addEnemies(...)`.
- `Developer/r3f_prototype/src/components/Enemy.jsx`
  - Instancing gate is limited to standard types `E01`–`E06`.
  - `useInstanced = !forceMesh && !isMatilda && INSTANCED_TYPES.has(type)`; non-instanced enemies render through `<ZombieMesh ... isMatilda={isMatilda} ... />`.
- `Developer/r3f_prototype/src/components/ZombieInstanceLayer.jsx`
  - Fixed pool renderer covers standard/runner body slots; boss code slots 9–12 are blank in `TYPE_NAMES`, so bosses must not rely on this layer.
- `Developer/r3f_prototype/src/components/ZombieMesh.jsx`
  - Matilda: `if (isMatilda) return <MatildaMesh movementPose={animPhase !== 'stun'} />`.
  - B01: `B01BossZombieMesh` branch.
  - B02: `B02Stage2BossMesh` branch under `getStudioZombieItemId(type)` (`stage2-boss-v2`).
  - B03: `B03PhysicalEducationBossMesh` branch.
  - B04: `B04ChefBossMesh` branch confirmed at lines 993–997.
- `Developer/r3f_prototype/src/components/Enemies.test.jsx`
  - Existing focused tests cover boss runtime spawn routes for stages 1–4, `isPooledEnemyType` boss exclusion, `ZombieMesh` branch presence, random spawn positions, and once-only `shouldScheduleBurst` behavior.
  - Existing focused Matilda test covers entry grace imports, gameplay-time delay calculation, scheduler gating, B01 stats override/Matilda visual flag, and `MatildaMesh` usage.
- `Developer/r3f_prototype/scripts/assert-no-legacy-b02.mjs`
  - Invoked by pretest and passed, confirming the Stage 2 B02 no-legacy gate in source during this QA run.

## Commands and results
1. Confirmed boss runtime/static events:
```bash
node --input-type=module - <<'EOF'
import { getBurstEventsForStage, getRuntimeBurstEventsForStage, isBossType } from './src/lib/burstEvents.js'
for (const stage of ['stage1','stage2','stage3','stage4']) {
  const staticBoss = getBurstEventsForStage(stage).filter((event) => isBossType(event.type))
  const runtimeBoss = getRuntimeBurstEventsForStage(stage, 173).filter((event) => isBossType(event.type))
  console.log(`${stage} static=${JSON.stringify(staticBoss)} runtime@173=${JSON.stringify(runtimeBoss)}`)
}
EOF
```
Result:
```text
stage1 static=[{"sec":192,"type":"B01","count":1}] runtime@173=[{"sec":173,"type":"B01","count":1}]
stage2 static=[{"sec":120,"type":"B02","count":1}] runtime@173=[{"sec":173,"type":"B02","count":1}]
stage3 static=[{"sec":135,"type":"B03","count":1}] runtime@173=[{"sec":173,"type":"B03","count":1}]
stage4 static=[{"sec":140,"type":"B04","count":1}] runtime@173=[{"sec":173,"type":"B04","count":1}]
```

2. Focused acceptance tests:
```bash
npm test -- src/components/Enemies.test.jsx src/components/ZombieMesh.test.js
```
Result:
```text
pretest gates passed:
- branch guard: ok (`zombie_only`, head `d509a4f2854ac0761a63e9850b54a9741d3a376a`)
- Title surface canonical gate passed.
- Canonical title BGM source gate passed.
- Legacy B02 source gate passed.
- Dialogue store gate passed (451 Korean IDs).

Vitest:
Test Files  2 passed (2)
Tests       111 passed (111)
Duration    1.89s
```

3. Workspace status check:
```bash
git status --short --branch
```
Result:
- Branch: `zombie_only...origin/zombie_only`
- Workspace already had many modified/untracked files before/around this read-only acceptance review. This QA pass did not revert or edit unrelated title/login/Firebase/hosting/balance/assets changes.
- Related QA record created: `Quaility_Assurance/boss_matilda_visible_spawn_route_runtime_acceptance_2026-08-08.md`.

## Acceptance verdict
PASS.

- B01/B02/B03/B04 are excluded from `ZombieInstanceLayer` pooling by `isPooledEnemyType(... && !isBossType(type))` and route through `Enemy -> ZombieMesh`.
- Matilda is excluded from instancing by `isMatilda` and routes through `Enemy -> ZombieMesh -> MatildaMesh` after gameplay-time entry grace.
- Stage 2 current boss route is `B02` / `stage2-boss-v2`; no legacy B02 source gate passed.
- Runtime boss event replacement produced exactly one boss event per stage at runtime second `173`; focused tests also cover once-only scheduling.

## Blockers
None.

## Observations / risks
- Dirty workspace contains many unrelated modified/untracked files. This review intentionally did not revert or modify them.
- Runtime behavior is verified by source-level and focused unit tests, not by a browser/server playthrough, per task instruction: no browser/server/deploy.
