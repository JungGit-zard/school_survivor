# Stage 1 unconscious student density validation - 2026-06-11

## Scope

- Validate that Stage 1 now has five times as many unconscious student placements as before.

## Automated checks

- Added a test that expects 10 Stage 1 unconscious student placements.
- Existing central spawn/play-zone spacing test remains active.
- Existing player-matched scale test remains active for every unconscious student placement.

## Command

- `npm.cmd test -- --run src/components/StageObjects/stageObjectPlacements.test.js --pool=threads`
