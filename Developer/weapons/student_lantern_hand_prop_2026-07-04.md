# Student Lantern Hand Prop - 2026-07-04

- Added a small block lantern prop to the player's right hand group.
- The prop is visible only while the `lanternAim` player arm action is active.
- Reused the existing toon block player mesh; no new model or asset pipeline was added.
- Follow-up fix: moved the prop from `[0, -0.98, 0.1]` to `[0, -0.76, 0.18]` and enlarged it so it sits visibly at the hand tip instead of appearing detached in the beam.
- Graphics Studio now accepts `lantern` as a Motion value and previews the player with `previewArmAction="lanternAim"`.
