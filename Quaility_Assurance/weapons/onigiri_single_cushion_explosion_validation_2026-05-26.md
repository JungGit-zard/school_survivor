# Onigiri Single Cushion Explosion Validation - 2026-05-26

## Checks

- `npm.cmd test -- --run src/lib/onigiri.test.js src/lib/weaponCatalog.test.js`
  - Passed: 2 files, 19 tests.
- `npm.cmd test -- --run`
  - Passed: 23 files, 147 tests.
- `npm.cmd run build`
  - Passed.

## Notes

- Build still reports the existing large chunk warning after minification.
