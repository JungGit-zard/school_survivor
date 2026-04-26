# School Bag Hit Feedback Check - 2026-04-26

## Scope

- Increased school bag swing speed by 3x.
- Added one-frame white hit flash on zombies.
- Added short physical knockback for zombies hit by school bag swing.

## Verification

- `npm run build` passed in `Developer/r3f_prototype`.

## Manual Check Needed

- Confirm in browser that the swing feels visibly faster.
- Confirm zombies briefly flash white on hit.
- Confirm school bag hits push zombies slightly away from the player without breaking enemy movement.
