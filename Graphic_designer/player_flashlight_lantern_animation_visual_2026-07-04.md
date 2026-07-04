# Player flashlight lantern visual - 2026-07-04

## Visual Direction

- The hand prop follows the provided blue handheld flashlight reference.
- The model is intentionally small so it reads as an item held by the player's extended hand, not as a separate floor object.
- Parts are separated into blue body, top handle, yellow switch, dark lens barrel, bright lens face, and black strap detail.

## Rendering Rules

- Uses the existing three.js toon material and outline block style.
- The prop is parented under the right sleeve group, so it stays attached to the forward hand during the lantern attack pose.
- The prop is visible only during `lanternAim` or `lanternFlashlight` arm actions.
- A translucent warm light cone is attached directly in front of the white lens and scaled to the student lantern attack range.

## Studio

- `lanternFlashlight` is available as a distinct Motion value in Graphics Studio.
- The studio preview maps `lanternFlashlight` to the same runtime hand pose used by the in-game student lantern attack.
