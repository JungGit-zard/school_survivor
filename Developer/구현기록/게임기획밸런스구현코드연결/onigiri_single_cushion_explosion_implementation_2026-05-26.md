# Onigiri Single Cushion Explosion Implementation - 2026-05-26

## Changes

- Changed `WEAPON_CATALOG.onigiri.base.cooldown` from 2000ms to 5000ms.
- Changed `WEAPON_CATALOG.onigiri.base.bounces` from 4 to 1.
- Changed `shouldShowRiceBurst` so `bounces` means remaining cushion count:
  - `1`: one cushion still available.
  - `0`: cushion has just been consumed; continue to next target.
  - `-1`: next enemy contact after cushions are gone; burst.

## Files

- `src/lib/weaponCatalog.js`
- `src/lib/onigiri.js`
- `src/lib/weaponCatalog.test.js`
- `src/lib/onigiri.test.js`
