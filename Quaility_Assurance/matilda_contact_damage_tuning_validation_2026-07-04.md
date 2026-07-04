# Matilda Contact Damage Tuning Validation - 2026-07-04

RED/GREEN:

```bash
npm test -- src/components/EnemyVisual.test.js -t Matilda
```

Result:
- RED: `getChargeHitDistance` was missing.
- GREEN: Matilda charge distance now uses collider body contact distance, while other chargers keep `1.5x`.

Related verification:

```bash
npm test -- src/components/EnemyVisual.test.js src/components/Enemies.test.jsx
npm run build
```

Result:
- 2 test files passed, 22 tests passed.
- Production build passed. Vite reported existing large chunk/dynamic import warnings.

Follow-up regression:
- Reproduced the root cause as a failing Matilda distance test: damage distance was below the collider body-contact distance.
- Verified after fix with the same test command and production build.
