# Stage 1 unconscious student density implementation - 2026-06-11

## Request

- Increase the unconscious student stage placement density by 5x.

## Implementation

- Added 8 new Stage 1 `unconsciousStudent` placements.
- Stage 1 now contains 10 unconscious student placements total.
- All placements use `UNCONSCIOUS_STUDENT_PLAYER_SCALE`.
- New placements are distributed around the outer classroom area to avoid the center spawn/play zone.

## Verification

- `npm.cmd test -- --run src/components/StageObjects/stageObjectPlacements.test.js --pool=threads`
