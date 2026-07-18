# Auto Attack Review Notes - 2026-04-26

## Scope

- Reviewed the automatic weapon flow in `Developer/r3f_prototype/src/components/Weapons.jsx`.
- Reviewed enemy registration and damage hooks in `Developer/r3f_prototype/src/components/Enemy.jsx`.
- Checked spawn flow in `Developer/r3f_prototype/src/components/Enemies.jsx`.

## Findings

- `EnemyProjectile` passed an array with out-of-scope variables as the second `useFrame` argument. In React Three Fiber, this argument is render priority, not a dependency array.
- `Enemy` registered each rigid body in `enemyBodies`, but the effect had no dependency list. That made cleanup and re-registration happen after every render.
- `PencilThrow` consumed its cooldown before confirming that a target existed. If no enemy was inside range yet, the next valid attack could be delayed.
- The homing pencil relied mainly on Rapier intersection callbacks. A direct close-range target check makes the hit more reliable for fast moving projectiles.

## Changes

- Removed the invalid `useFrame` second argument in `EnemyProjectile`.
- Added an explicit dependency list and cleanup block to the enemy body registration effect.
- Moved pencil cooldown consumption until after a live target is found.
- Added a close-distance hit fallback for the homing pencil.
- Changed enemy spawning from far map edges to a player-centered spawn ring so zombies enter the visible phone viewport quickly.

## Verification

- `npm run build` passed in `Developer/r3f_prototype`.
