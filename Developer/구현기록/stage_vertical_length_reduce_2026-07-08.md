# Stage Vertical Length Reduction Implementation

Date: 2026-07-08

## Changed

- Updated `stageConfig.js`:
  - Stage 1 `mapHalfZ`: 18 -> 14.4.
  - Stage 2 `mapHalfZ`: 48 -> 38.4.
- Updated `stageConfig.test.js` expectations.

## Notes

- `getStageBounds()` already feeds floor size, walls, camera clamp, movement bounds, spawn bounds, and escape portal placement, so no extra per-caller edits were needed.
