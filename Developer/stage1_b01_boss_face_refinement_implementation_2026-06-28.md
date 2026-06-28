# Stage 1 B01 Boss Face Refinement Implementation

Date: 2026-06-28 18:59 KST

## Scope

Stage 1 boss `B01` face readability refinement.

## Problem

The previous B01 face used several similarly sized small blocks at nearly the same depth. In the actual game camera, the eyes, mouth, tooth, and cheek shadow could read as a noisy cluster.

## Change

- Added `B01_BOSS_FACE_LAYOUT` as the explicit face layout source.
- Added `simplifiedFace` to the B01 visual part list.
- Reduced face detail density:
  - one dark damaged eye block
  - one light eye block with a small pupil
  - one compact mouth block
  - one small tooth block
  - a slimmer cheek shadow moved away from the main facial read

## Gameplay Impact

No gameplay stats, hitbox, movement, spawn timing, damage, or boss behavior changed.
