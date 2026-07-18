# Guided Missile Unlock Visibility Validation - 2026-05-26

## Checks

- `npm.cmd test -- --run src/store/useGameStore.guidedMissileUnlock.test.js`
  - Passed: 1 file, 3 tests.
- `npm.cmd test -- --run src/store/useGameStore.guidedMissileUnlock.test.js src/lib/weaponCatalog.test.js src/store/useGameStore.unlocks.test.js`
  - Passed: 3 files, 36 tests.
- `npm.cmd test -- --run`
  - Passed: 23 files, 147 tests.
- `npm.cmd run build`
  - Passed.

## Notes

- Build still reports the existing large chunk warning after minification.
- Browser visual verification was not performed in this pass because the issue is unlock/card-pool logic and is covered by automated tests.
