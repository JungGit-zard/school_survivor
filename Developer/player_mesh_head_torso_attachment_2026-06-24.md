# Player Mesh Head/Torso Attachment - 2026-06-24

## Change

- Moved the shared player head base Y from `1.40` to `1.12` in `PlayerMesh.jsx`.
- Added `PLAYER_MESH_LAYOUT` so the body, head, and motion bob limits are testable from one source.
- Updated the player head outline and initial hair/eye positions to use the same head base constant as the runtime animation.
- Updated idle/walk bob animation to read from the shared layout constants, so future motion changes are covered by the layout test.

## Reason

Graphics Studio and the in-game player both render through `PlayerVisual -> PlayerMesh`, so the visible head/body gap was present in both places. The new layout keeps the head bottom connected to the torso even at peak idle/walk bob.
