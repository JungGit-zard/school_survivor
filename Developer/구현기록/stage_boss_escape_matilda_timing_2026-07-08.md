# Stage Boss / Escape / Matilda Timing Implementation

Date: 2026-07-08

## Changed

- Updated `stageConfig.js` so Stage 1 and Stage 2 use:
  - boss timing: 120 seconds
  - escape portal timing: 150 seconds
  - Matilda warning: 170 seconds
  - Matilda spawn: 180 seconds
- Updated boss burst events in `Enemies.jsx` so B01 and B02 actually spawn at 120 seconds.
- Updated Stage 2 projectile boss-pressure logic in `Enemy.jsx` to read boss start/end timing from `stageConfig` instead of hardcoded seconds.
- Replaced stale inline comments that referenced old fixed times.

## Notes

- Stage duration remains 240 seconds.
- Reward milestone timing was not changed in this request.
