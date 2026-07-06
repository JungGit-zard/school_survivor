# Stage 2 E04 Spawn Halved Validation - 2026-07-07

## Checked

- Stage 1 still excludes E04 from waves and burst events.
- Stage 2 still introduces E04 at 72 seconds.
- Stage 2 E04 wave weights are halved while phase weight totals remain 1.0.
- Stage 2 E04 burst events are reduced to 72s and 216s.
- Stage 2 E04 simultaneous enemy cap is now 1 before 96s and 2 afterward.

## Commands

- `npm test -- src/components/Enemies.test.jsx src/lib/stage2ProjectileRules.test.js src/lib/waveControl.test.js`
  - Passed: 3 files, 37 tests.
