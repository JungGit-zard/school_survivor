# Enemy Spawn Line Formation Fix Implementation - 2026-06-30

## Changes

- Updated `src/components/Enemies.jsx` to resample enemy spawn points that would land outside the map.
- Kept clamp only as a final fallback.
- Added per-batch spacing for burst and maintenance spawns.
- Exported `randomSpawnPos` for focused spawn-placement coverage.

## Verification

- `npm test -- Enemies.test.jsx -t "enemy spawn placement"` passed.
- `npm run build` passed.

## Note

The full `Enemies.test.jsx` suite currently has an unrelated existing balance expectation mismatch: the test expects E06 weight `0.02`, while the working tree has `0.05`.

