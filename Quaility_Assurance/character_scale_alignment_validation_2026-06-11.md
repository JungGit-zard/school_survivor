# Character scale alignment validation - 2026-06-11

## Scope

- Validate that unconscious students are no longer oversized compared with the player character.

## Automated checks

- Added a placement test that compares the unconscious student's world length against the player mesh world height.
- Confirmed the StageObjects asset tests still pass.

## Commands

- `npm.cmd test -- --run src/components/StageObjects/stageObjectPlacements.test.js src/components/StageObjects/stageObjectAssets.test.jsx --pool=threads`
- `npm.cmd run build`

## Manual check

- Opened `http://127.0.0.1:5178` through `agent-browser`.
- Entered Stage 1 through the title screen.
- Full near-prop visual inspection was limited because the player died while moving from the center spawn toward the outer classroom prop placements.
