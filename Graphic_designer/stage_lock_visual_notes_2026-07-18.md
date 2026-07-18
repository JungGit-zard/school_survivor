# Stage Lock visual notes — 2026-07-18

Task: t_b8995205 — Create simple low-poly 3D stage lock and register it in Graphics Studio.

## Visual direction
- Implemented as a code-native Three.js/R3F low-poly padlock, not a bitmap or external model.
- Silhouette is intentionally simple and readable for lobby/card use:
  - compact bright-gold rectangular lock body,
  - silver U-shaped shackle built from low-segment cylinders,
  - small darker-gold box shackle collars at the two shackle bases,
  - dark front keyhole with the circular face rotated toward the positive-Z/front preview camera.
- Toon treatment follows the project 3D cartoon rule through cached toon materials and explicit outline meshes.
- Keyhole is on the positive-Z front face so it faces the shared preview/lobby camera framing.

## Scope boundaries
- No Lobby.jsx wiring was added yet.
- No gameplay runtime, physics, audio, bitmap generation, or external assets were added.
- Graphics Studio registration uses the shared item id `stage-lock` and the existing StudioTunedGroup tuning path.

## Verification
- Focused tests passed for model structure, box collar shape, keyhole front rotation, preview Canvas hook, catalog registration, and item-id consistency.
- Browser Studio check at `/graphics-studio#stage-lock` confirmed the visual appears in the live Graphics Studio canvas as a simple low-poly 3D padlock: bright gold body, silver U-shaped shackle, small gold collar blocks, and dark front keyhole.
