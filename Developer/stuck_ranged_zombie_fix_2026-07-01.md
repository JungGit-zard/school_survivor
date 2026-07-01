# Stuck Ranged Zombie Fix

## Cause

- `E04` ranged zombies set velocity to `0,0` while inside their preferred distance band.
- During normal stage play this looked like a zombie standing still.

## Fix

- Added `resolveRangedEnemyVelocity`.
- Too close: move away.
- Too far: move toward the player.
- Preferred range: strafe sideways instead of stopping.

## Verification

- `npm test -- Enemies.test.jsx`: passed.
- `npm test`: passed, 65 files / 359 tests.
- `npm run build`: passed.
