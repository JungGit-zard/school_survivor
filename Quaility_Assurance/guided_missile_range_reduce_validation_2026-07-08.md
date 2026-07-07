# Guided Missile Range Reduction Validation

Date: 2026-07-08

## Expected

- `guidedMissile.base.range` is `7.34`.
- The runtime missile fallback range is also `7.34`.

## Result

- `npm test -- src/lib/weaponCatalog.test.js`: passed after the `7.34` follow-up adjustment, 1 file / 22 tests.
- `npm run build`: passed after the `7.34` follow-up adjustment.
- Vite reported existing bundle-size and dynamic-import warnings; no guided missile range build error was found.
