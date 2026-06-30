# Charge GO Speech Bubble Restore Implementation - 2026-07-01

## Changes

- Restored the charger warning cue as an in-world 3D toon speech bubble above E05/B01 during `warn`.
- Kept the cue non-HTML and non-sprite.
- Made the bubble face the camera so the `GO!` block lettering does not break into unreadable side views.

## Verification

- `npm test -- EnemyVisual.test.js` passed.
- Browser Graphics Studio check captured `Zombie E05` with Motion `warn`.
