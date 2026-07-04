# Matilda Contact Damage Tuning - 2026-07-04

Scope:
- Matilda charge damage now uses exact normal body contact distance.
- Other charger enemies keep the existing `1.5x` charge grace distance.
- Fixed the gap where Matilda could physically push the player before the damage distance was reached.

Implementation:
- Added `getChargeHitDistance(stats, isMatilda)`.
- Added `getBodyContactDistance(stats)` based on enemy/player collider half extents.
- Replaced the charge hit check with the helper so Matilda does not damage the player before body contact.

Root cause:
- The previous Matilda distance used `contactDist * ENEMY_SIZE_MULTIPLIER` (`0.48` for Matilda).
- The actual Matilda/player collider contact distance is larger, so physics contact could push the player while damage did not trigger.
