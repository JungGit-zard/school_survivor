# Stage 4 enemy bounds/targeting diagnosis — 2026-08-23

## Scope
- Task: Diagnose only the Stage 4 left/right zombie escape and non-targetability report.
- No fix implementation in this diagnosis pass; Stage 4 prop placement was not touched by this pass.
- Stage 4 current gameplay bounds: `halfX=9.36`, `halfZ=16` (`floorWidth=18.72`, `floorDepth=32`).

## Files/paths inspected
- `Developer/r3f_prototype/src/lib/stageConfig.js`
- `Developer/r3f_prototype/src/components/ClassroomFloor.jsx`
- `Developer/r3f_prototype/src/components/ClassroomFloor.test.jsx`
- `Developer/r3f_prototype/src/components/Enemies.jsx`
- `Developer/r3f_prototype/src/lib/enemySimulation.js`
- `Developer/r3f_prototype/src/lib/weaponTargeting.js`
- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/components/Game.jsx`
- `Developer/r3f_prototype/src/components/PooledEnemyVisuals.js`
- `Developer/r3f_prototype/src/components/StageObjects/stageObjectColliders.js`
- `Developer/r3f_prototype/src/components/StageObjects/stageObjectColliders.test.js`
- `Developer/r3f_prototype/src/components/StageObjects/stage4PropLayout.static.test.js`
- `Developer/r3f_prototype/src/lib/stage4SpecialEnemyBounds.test.js`

## Diagnosis summary
The Stage 4 ordinary pooled enemy path is already bound-aware:
- Stage runtime cache builds `bounds = getStageBounds(currentStageId)` in `Enemies.jsx`.
- Burst/overtime/formation spawn calls pass `cache.bounds` into `spawnPosForBurstType`, `randomSpawnPos`, and `formationSpawnPositions`.
- Pooled enemy simulation receives `context.halfX = bounds.halfX` and `context.halfZ = bounds.halfZ` before `enemySimulationRuntime.step(...)`.
- `enemySimulation.js` clamps/moves pooled enemies with those `halfX/halfZ` values and rebuilds the spatial grid with `halfX + 6`, `halfZ + 6`.
- `weaponTargeting.js` does not use stage/screen bounds as an exclusion filter for ordinary pool target acquisition; it filters by active state, distance/range, generation safety, and sight blockers.

The red reproduction isolates the report to the special React/Rapier enemy path, especially Stage 4 B04:
- B04 is a special enemy rendered/stepped through `Enemy.jsx`, not the ordinary pooled `enemySimulation` clamp path.
- Before a special-enemy bound clamp, B04 ranged strafe can produce outward X velocity at the exact Stage 4 right collision edge.
- With Stage 4 `halfX=9.36` and B04 half-width `0.373333...`, the legal center edge is `x=8.986666...`.
- One 1/30s lateral strafe tick at `velocity.x≈1.2` moves the center to `x=9.026666...`, beyond the legal collision edge.
- If the player is exactly at Pencil's inclusive `2.25u` acquisition edge before that tick, post-tick distance becomes `2.29u`, which reproduces the observed “zombie reaches side / stops being targetable” symptom.

## Deterministic RED reproduction command and captured red result
This command uses a temporary copy of `HEAD:Enemy.jsx` as the pre-special-bound implementation and deletes temporary files on exit. It does not persist source edits.

Command run from `Developer/r3f_prototype`:

```bash
set -e
trap 'rm -f src/components/Enemy.prebounds.tmp.jsx src/lib/stage4SpecialEnemyBounds.prebounds-red.tmp.test.js' EXIT
git show HEAD:Developer/r3f_prototype/src/components/Enemy.jsx > src/components/Enemy.prebounds.tmp.jsx
cat > src/lib/stage4SpecialEnemyBounds.prebounds-red.tmp.test.js <<'EOF'
import { describe, expect, it } from 'vitest'
import { ENEMY_STATS, getEnemyColliderHalfExtents, resolveRangedEnemyVelocity } from '../components/Enemy.prebounds.tmp.jsx'
import { getStageBounds } from './stageConfig.js'

describe('Stage 4 B04 lateral-boundary regression (pre-bounds RED reproduction)', () => {
  it('shows pre-bounds special B04 lateral strafe can step past the Stage 4 combat edge and drop out of pencil range', () => {
    const { halfX } = getStageBounds('stage4')
    const [halfWidth] = getEnemyColliderHalfExtents(ENEMY_STATS.B04)
    const edgeX = halfX - halfWidth
    const velocity = resolveRangedEnemyVelocity({
      dirX: 0,
      dirZ: -5,
      dist: 5,
      minDist: 3,
      preferDist: 5,
      speed: 1.6,
      strafeSign: 1,
    })
    const nextX = edgeX + velocity.x / 30
    const playerX = edgeX - 2.25
    expect(edgeX).toBeCloseTo(8.986666666666666, 12)
    expect(velocity.x).toBeCloseTo(1.2, 12)
    expect(nextX).toBeCloseTo(9.026666666666666, 12)
    expect(Math.abs(nextX - playerX)).toBeCloseTo(2.29, 12)
    expect(Math.abs(nextX - playerX)).toBeLessThanOrEqual(2.25)
    expect(nextX).toBeLessThanOrEqual(edgeX)
  })
})
EOF
npm test -- --run src/lib/stage4SpecialEnemyBounds.prebounds-red.tmp.test.js
```

Captured red result:

```text
FAIL  src/lib/stage4SpecialEnemyBounds.prebounds-red.tmp.test.js > Stage 4 B04 lateral-boundary regression (pre-bounds RED reproduction) > shows pre-bounds special B04 lateral strafe can step past the Stage 4 combat edge and drop out of pencil range
AssertionError: expected 2.289999999999999 to be less than or equal to 2.25
 ❯ src/lib/stage4SpecialEnemyBounds.prebounds-red.tmp.test.js:25:39
     23|     expect(nextX).toBeCloseTo(9.026666666666666, 12)
     24|     expect(Math.abs(nextX - playerX)).toBeCloseTo(2.29, 12)
     25|     expect(Math.abs(nextX - playerX)).toBeLessThanOrEqual(2.25)
       |                                       ^

Test Files  1 failed (1)
Tests  1 failed (1)
```

Temporary file cleanup was verified afterward:

```text
TMP_CLEANED
```

## Current working-tree verification run
A focused check against the current working tree was also run:

```bash
npm test -- --run src/lib/stage4SpecialEnemyBounds.test.js
```

Captured result:

```text
✓ src/lib/stage4SpecialEnemyBounds.test.js (1 test) 3ms
Test Files  1 passed (1)
Tests  1 passed (1)
```

This means the existing dirty working tree already contains a special-enemy Stage 4 bounds guard that makes the red harness pass. This diagnosis pass did not author or modify that source implementation.

## Broader focused test run
Command:

```bash
npm test -- --run src/components/Enemies.test.jsx src/lib/weaponTargeting.test.js src/components/StageObjects/stageObjectColliders.test.js src/components/StageObjects/stage4PropLayout.static.test.js
```

Result summary:

```text
✓ src/components/StageObjects/stage4PropLayout.static.test.js (4 tests)
✓ src/lib/weaponTargeting.test.js (33 tests)
✓ src/components/Enemies.test.jsx (117 tests)
❯ src/components/StageObjects/stageObjectColliders.test.js (14 tests | 1 failed)
Test Files  1 failed | 3 passed (4)
Tests  1 failed | 167 passed (168)
```

The failing collider test is prop-layout related, not the diagnosed enemy target acquisition root cause. It reports several Stage 4 wall gaps of `0.800u`, e.g.:

```text
stage4-cookline-north-center-collider -Z gap=0.800
stage4-refrigerator-north-west-closed-collider -X gap=0.800
stage4-shelfcart-east-north-collider +X gap=0.800
...
```

Per task instruction, this pass did not touch Stage 4 prop placement.

## Camera/screen bounds notes
- `Game.jsx` derives `screenBounds` from the current stage bounds and camera reach each frame.
- `screenBounds` is used for visual/render tiering and projectile stepping, not as the authoritative ordinary enemy target-acquisition filter.
- `PooledEnemyVisuals.getPooledEnemyRenderTier(...)` can cull visuals outside camera+margin, but this does not explain the deterministic Pencil range loss; the red reproduction shows a numeric range loss after B04 crosses the legal Stage 4 center edge.

## Recommended fix direction for a follow-up implementation/review task
- Keep the fix in the special enemy path (`Enemy.jsx`), not in Stage 4 prop placement.
- Apply the same stage-combat bounds semantics used by pooled enemies to special enemies: clamp current translation to `[±halfX/±halfZ]` minus collider half extents and clamp outgoing velocity so the next integration step cannot cross that legal center range.
- Keep the RED regression as a permanent test after implementation review, but ensure it imports the current implementation rather than a temp `HEAD` copy.
- QA handoff to Balance_QA_Mini: replay Stage 4 around B04 spawn/boss phase and check both left/right wall contact while Pencil or short-range weapons are near exact range boundary. Acceptance should confirm B04 cannot leave `x ∈ [-8.9867, 8.9867]` center range and remains targetable by distance math when within weapon range.

## Dirty-tree preservation note
At the time of diagnosis, the repository already had multiple modified/untracked files. This pass preserved them and only added this planner artifact.
