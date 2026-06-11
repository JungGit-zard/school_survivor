# Character scale alignment - 2026-06-11

## Request

- Make the unconscious student prop match the main player character at a 1:1 visual scale.

## Implementation

- Added shared character visual metrics in `Developer/r3f_prototype/src/lib/characterVisualScale.js`.
- Reused `PLAYER_MESH_SCALE` in `PlayerMesh.jsx` so the player model scale has a single source of truth.
- Changed Stage 1 unconscious student placements to use `UNCONSCIOUS_STUDENT_PLAYER_SCALE`.
- The unconscious student scale is calculated from player world height and the lying student's raw model length, so it matches the player visually instead of using the old oversized prop scale.

## Verification

- `npm.cmd test -- --run src/components/StageObjects/stageObjectPlacements.test.js src/components/StageObjects/stageObjectAssets.test.jsx --pool=threads`
- `npm.cmd run build`
