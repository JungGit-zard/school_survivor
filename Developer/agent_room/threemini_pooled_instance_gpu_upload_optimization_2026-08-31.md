# Three_Mini pooled instance GPU upload optimization record — 2026-08-31

Task: t_eff64fa2
Branch: zombie_only / wt/mobile-instance-upload-opt worktree
Baseline pinned in task body: 3d759c5c
Scope: Developer/r3f_prototype/src/components/ZombieInstanceLayer.jsx, Developer/r3f_prototype/src/components/PooledEnemyProjectileLayer.jsx, direct focused tests.

## Implementation
- Added reusable Three r164 update-range helpers using clearUpdateRanges()/addUpdateRange().
- Per-frame ZombieInstanceLayer uploads now mark only positive-count prefixes:
  - body: matrix + color
  - outline: matrix only
  - shadow: matrix only
  - health bars 0/1/3: matrix only
  - health bar 2: matrix + alpha
  - spawn smoke: matrix + alpha
  - charge cue: matrix + color
- Reset path still zeroes canonical buffers, restores alpha defaults, clears all update ranges, and marks full canonical buffers.
- PooledEnemyProjectileLayer now marks only active kind prefixes for body/outline matrices; reset remains full-buffer.

## Verification evidence
- npm test -- src/components/ZombieInstanceLayer.test.js src/components/PooledEnemyProjectileLayer.test.js -- --runInBand: PASS, 13 tests passed. Note: extra --runInBand after `--` did not affect Vitest in this command shape.
- npm test -- src/lib/enemySimulation.test.js src/lib/pooledEnemySpawnDrain.test.js src/components/PooledEnemyVisuals.test.js src/components/ZombieInstanceLayer.test.js src/components/PooledEnemyProjectileLayer.test.js: PASS, 5 files / 74 tests passed, including 200-enemy soak cases.
- npm run build: PASS. Firebase release env gate passed; studio-game sync verification passed; Vite production build and postbuild asset gates passed.
- git diff --check -- scoped files: PASS exit code 0. Git reported existing CRLF normalization warnings for ZombieInstanceLayer.jsx and ZombieInstanceLayer.test.js, but no whitespace errors.

## Negative evidence / non-goals
- A full unbounded `npm test` run is not a clean verification signal in this worktree: it hit unrelated pre-existing suite failures and Windows fork spawn/memory errors. The scoped task suites and production build were used as the relevant acceptance evidence.
- No Firebase/network/device mutation, package/version/AAB change, commit, or push was performed.

## Changed files in task scope
- Developer/r3f_prototype/src/components/ZombieInstanceLayer.jsx
- Developer/r3f_prototype/src/components/PooledEnemyProjectileLayer.jsx
- Developer/r3f_prototype/src/components/ZombieInstanceLayer.test.js
- Developer/r3f_prototype/src/components/PooledEnemyProjectileLayer.test.js
- Developer/agent_room/threemini_pooled_instance_gpu_upload_optimization_2026-08-31.md
