# Enemy Spawn Straight-Line Block Implementation - 2026-07-01

## Changes

- Added straight-line rejection to `src/components/Enemies.jsx` spawn gap checks.
- Added fallback offsets so the final spawn fallback also avoids extending a visible line.
- Kept wave counts, timing, and enemy weights unchanged.

## Verification

- `npm test -- Enemies.test.jsx -t "enemy spawn placement"` passed.
- `npm test -- Enemies.test.jsx` passed.
