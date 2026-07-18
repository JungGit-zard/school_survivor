# Stage 1 Mixed Prop Layout Implementation

## Summary

Added classroom chairs and unconscious students to Stage 1 placement data alongside the existing desks.

## Code Changes

- `src/components/StageObjects/stageObjectPlacements.js`
  - Added `classroomChair` objects to northwest, northeast, west, and east outer zones.
  - Added two `unconsciousStudent` objects to southwest and southeast outer zones.
  - Kept existing desk placements but adjusted two corner desk coordinates slightly to make room for paired props.

- `src/components/StageObjects/stageObjectPlacements.test.js`
  - Updated supported type checks for mixed stage objects.
  - Added coverage that Stage 1 includes desks, chairs, and unconscious students.
  - Added coverage for disrupted chair variants and multiple unconscious student variants.
  - Scoped the existing desk variant assertion to desk objects only.

## Verification

- `npm test -- src/components/StageObjects/stageObjectPlacements.test.js --pool=threads`: passed.
- `npm test -- src/components/StageObjects/stageObjectPlacements.test.js src/components/StageObjects/stageObjectAssets.test.jsx --pool=threads`: passed, 2 files / 9 tests.
- `npx vitest run --pool=forks --maxWorkers=1`: passed, 35 files / 210 tests.
- `npm run build`: passed, with existing large chunk/plugin timing warnings.
