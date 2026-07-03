# Matilda idle studio hash implementation - 2026-07-02

## Scope

- Added direct Graphics Studio entry by catalog hash.
- `http://127.0.0.1:5173/graphics-studio#enemy-matilda` now opens the Matilda preview instead of the default Player preview.
- No Matilda mesh behavior was rewritten because `MatildaMesh.jsx` already contains the approved idle hover:
  - default `movementPose = false`
  - positive float base height
  - small vertical sine bob
  - light side sway

## Files

- `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`
- `Developer/r3f_prototype/src/components/GraphicsStudio.test.jsx`

## Note

- `Developer/r3f_prototype/src/components/Enemies.jsx` has an unrelated `[DEBUG-xp]` local diff and was not changed for this task.
