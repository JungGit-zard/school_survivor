# Stage 1 B01 Reference Boss Visual Implementation

Date: 2026-06-28

## Scope

Applied the requested reference direction to Stage 1 boss `B01`.

## Files

- `Developer/r3f_prototype/src/components/ZombieMesh.jsx`
  - Added `B01_BOSS_VISUAL_PALETTE`.
  - Added `B01_BOSS_VISUAL_PARTS`.
  - Added a B01-only boss mesh built from existing `ZBlock` toon/outline blocks.
  - Kept existing animation refs: `head`, `body`, `armL`, `armR`, `legL`, `legR`.
- `Developer/r3f_prototype/src/components/ZombieMesh.test.js`
  - Added regression coverage for B01 visual palette/parts and unchanged gameplay stats.

## Not Changed

- `ENEMY_STATS.B01`
- B01 collider
- B01 spawn schedule
- B01 charge behavior
- shared toon/outline helpers
