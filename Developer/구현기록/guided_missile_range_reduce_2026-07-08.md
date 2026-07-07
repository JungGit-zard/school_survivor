# Guided Missile Range Reduction

Date: 2026-07-08

## Changed

- Updated `WEAPON_CATALOG.guidedMissile.base.range` from `22` to `14.67`, then `7.34`.
- Updated `Missile.jsx` fallback range from `22` to `14.67`, then `7.34`.
- Updated `weaponCatalog.test.js` expectation.

## Notes

- `14.67` is `22 * 2 / 3`, rounded to two decimals.
- `7.34` is the follow-up halved range, rounded to two decimals.
- Other missile stats were not changed.
