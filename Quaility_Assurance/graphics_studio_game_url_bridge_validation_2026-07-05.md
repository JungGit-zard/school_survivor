# Graphics Studio game URL bridge validation - 2026-07-05

## Passed

- Game URL connection opens the typed URL in the named game window.
- Graphics tuning changes post a sync message to the connected game window.
- Game-side message handling stores graphics and SFX tuning in the receiving origin.
- Targeted tests: 5 files, 38 tests.
- Production build passed.

## Remaining

Full `npm test` currently fails in unrelated ranking/database rule tests.

