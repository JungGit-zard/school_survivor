# Zombie Spawn Smoke Validation

Date: 2026-07-05

## Checks

- `npm test -- src/components/EnemyVisual.test.js src/components/ZombieInstanceLayer.test.js`
  - Passed: 2 files, 5 tests.
- `npm run build`
  - Passed.

## Coverage

- Confirms the enemy path mounts the spawn smoke effect.
- Confirms the effect uses a 2D image asset and a camera-facing Three.js sprite.
