# Title Scene Character Facing Tuning

Date: 2026-07-08

## Changed

- Turned the title player group from `Math.PI - 0.48` to `0.48` on Y rotation so the face points toward the user.
- Reduced player X tilt from `-0.12` to `-0.08`.
- Removed Matilda's `movementPose` on the title pursuer and set her group rotation to `[0, 0.18, 0]` so the face front is more visible.
- Updated `TitleScene3D` regression tests.
