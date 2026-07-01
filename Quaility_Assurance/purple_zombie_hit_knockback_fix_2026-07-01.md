# Purple Zombie Hit Knockback Fix QA

## Checks

- `resolveEnemyHitKnockback()` returns zero movement for ordinary hits.
- E02 purple zombies return zero movement even when weapon knockback is provided.
- Weapon-provided knockback values are preserved for other enemies.

## Result

- `npm test -- enemyHitVfx.test.js`: passed, 5 tests.
- `npm test`: passed, 65 files / 359 tests.
- `npm run build`: passed, with the existing large chunk warning.
