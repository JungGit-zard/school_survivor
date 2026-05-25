# Umbrella Guard Palette Validation - 2026-05-25

## Requirement

When the umbrella opens, its colors must use the five supplied HEX values:

- `#FFC9DE`
- `#C9E4FF`
- `#ACFF9F`
- `#D4F4DD`
- `#FFF6E5`

2026-05-25 follow-up requirement:

- Increase visual saturation by 50% using stronger runtime variants while preserving the five roles.
- Runtime values:
  - `#FF8FC4`
  - `#86C8FF`
  - `#78FF62`
  - `#94F9B7`
  - `#FFE4A8`

## Verification

- `npm.cmd test -- HUD.test.jsx weaponCatalog.test.js upgrades.test.js --run`: passed, 49 tests.
- `npm.cmd run build`: passed.
- 2026-05-25 follow-up verification:
  - `npm.cmd test -- CompassBlade.test.jsx HUD.test.jsx weaponCatalog.test.js upgrades.test.js --run`: passed, 51 tests.
  - `npm.cmd run build`: passed.
