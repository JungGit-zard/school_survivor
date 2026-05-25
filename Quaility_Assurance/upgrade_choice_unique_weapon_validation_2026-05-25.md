# Upgrade Choice Unique Weapon Validation - 2026-05-25

## Requirement

The three level-up choice slots must not contain two upgrade cards for the same weapon.

## Regression Test

- Added a HUD test with duplicate umbrella and duplicate onigiri upgrade options.
- Expected result: at most one umbrella card and at most one onigiri card remain.

## Verification

- `npm.cmd test -- HUD.test.jsx weaponCatalog.test.js upgrades.test.js --run`: passed, 49 tests.
- `npm.cmd run build`: passed.
