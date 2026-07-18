# School Bag Hit Feedback - 2026-04-26

## Visual Direction

- School bag swing should read as a fast melee strike.
- Hit zombies flash white for one rendered frame to make contact obvious.
- The flash keeps the black toon outline so the zombie silhouette remains readable.

## Implementation Notes

- `ZombieMesh` accepts `hitFlash` and temporarily renders block colors as bright white.
- The school bag swing duration is reduced from `420ms` to `140ms`.
- School bag impact sends knockback data to the enemy hit handler.
