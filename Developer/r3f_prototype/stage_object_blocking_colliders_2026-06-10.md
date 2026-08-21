---
module: r3f_prototype
tags: [stage-objects, collision, rapier, classroom-props]
problem_type: gameplay_collision
---

# Stage Object Blocking Colliders

## Context

Players and zombies use Rapier dynamic rigid bodies, but classroom desks and chairs were visual-only stage objects. This allowed both the player and zombies to overlap the desk and chair models.

## Change

- Added `stageObjectColliders.js` to derive fixed blocking collider parts from existing stage object placements.
- Added `StageObjectColliderLayer.jsx` to mount invisible fixed Rapier `CuboidCollider` parts next to the visual prop layer.
- Mounted the collider layer in `Floor.jsx` so every playable stage receives desk/chair blocking physics.
- Kept unconscious student props non-blocking so they remain set dressing instead of hard obstacles.

## Notes

- Collider x/z footprints follow the same object scale and variant transforms used by the visual prop placement.
- Collider y height has a minimum blocking height so small scaled props still physically stop the player and zombies.
