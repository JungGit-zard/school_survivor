# Zombie Spawn Reveal Validation

Date: 2026-07-11

## Planned Checks

- Run focused enemy visual tests.
- Run production build.
- Confirm no QA completion claim is made until commands pass.

## Acceptance Criteria

- Enemy smoke sprite mounts immediately at spawn position.
- Enemy rigid body and visual registry registration are delayed until reveal.
- Existing SFX ids are used without adding unreviewed audio files.

## Validation Result

- User-provided `Group 18.png` copied as `src/assets/effects/spawn_smoke_puff.png`.
- PNG signature and transparent corner pixels confirmed.
- Three.js `Sprite` rendering retained, so the smoke automatically faces the active camera as a billboard.
- Smoke scale constrained to `0.62 → 1.12` times the enemy visual scale so it stays compact.
- Focused tests: `35 passed` across `EnemyVisual.test.js` and `Enemies.test.jsx`.
- Production build: passed; Vite emitted the PNG in the build output.
- Full suite: `644 passed`, `2 failed`. Both failures are pre-existing Stage 2 worktree mismatches (`ClassroomFloor.test.jsx` corridor end position and `stageConfig.test.js` Stage 2 timing), outside this smoke asset change.
- In-app browser runtime inspection was unavailable in this session; visual confirmation remains a manual playtest check.
