# Player flashlight lantern animation - 2026-07-04

## Request

- Make the student lantern attack show a small handheld flashlight in the forward player hand.
- Register the produced animation in Graphics Studio with its own motion name.

## Implementation

- Added the distinct player arm action name `lanternFlashlight`.
- Updated `StudentLanternWeapon` to trigger `lanternFlashlight` during the active beam.
- Replaced the old simple yellow hand prop with a small blue flashlight model assembled from the existing toon block primitives.
- Kept the old `lantern` studio motion mapped to `lanternAim` for compatibility, and added `lanternFlashlight` as the named current motion.
- Moved the runtime lantern beam origin farther forward so the beam begins at the hand flashlight lens.
- Added a small local light cone to the held flashlight model for the Graphics Studio/player animation view.
- Scaled the held flashlight cone to the student lantern attack range (`2.08 x 3.6` world units).

## Files

- `src/lib/playerArmAction.js`
- `src/components/PlayerMesh.jsx`
- `src/components/Weapons/StudentLantern.jsx`
- `src/components/GraphicsStudio.jsx`
- `src/components/GraphicsStudioPreview.jsx`
- `src/lib/graphicsStudioConfig.js`
