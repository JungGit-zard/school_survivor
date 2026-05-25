# Compass Scale, Dash Go Bubble, Umbrella Saturation Validation - 2026-05-25

## Checklist

- Compass blade visible model is two thirds of the previous scale.
- Red charger zombies no longer spawn the ground dash warning VFX.
- Charger zombies show a small `go!` speech bubble above their head while stopped before the dash.
- Umbrella opened palette uses higher-saturation variants of the requested five colors.

## Verification

- `npm.cmd test -- CompassBlade.test.jsx HUD.test.jsx weaponCatalog.test.js upgrades.test.js --run`: passed, 51 tests.
- `npm.cmd run build`: passed.
- Build still reports the existing large chunk warning; it does not block the build.

