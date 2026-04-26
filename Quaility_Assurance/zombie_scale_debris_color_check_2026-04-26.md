# Zombie Scale and Debris Color Check

Date: 2026-04-26

## Scope

- Verify the zombie size revision requested by the user.
- Verify that zombie death debris no longer appears as plain black blocks.

## Changes Checked

- `Developer/r3f_prototype/src/components/Enemy.jsx`
  - `ENEMY_SIZE_MULTIPLIER` changed from `2` to `4 / 3`.
  - Enemy visual scale, collider scale, spawn height, contact distance, HP bar placement, and death debris scale remain driven by the same multiplier.

- `Developer/r3f_prototype/src/components/EnemyDeathCollapse.jsx`
  - Death debris uses a brightened version of each zombie palette color.
  - Death debris material emissive intensity is increased so the color remains visible.
  - Outline opacity and outline scale are reduced so the outline does not overpower the colored faces.

## Validation

- Ran `npm run build` in `Developer/r3f_prototype`.
- Result: build completed successfully.
- Build warning: Vite reported a large bundle chunk. This warning existed as a performance consideration and did not block the requested visual change.

## Remaining Manual Check

- In browser, kill several zombie types and confirm broken parts show green/purple/orange/red palette colors instead of black.
- Confirm the new zombie size feels readable and still matches contact range during play.
