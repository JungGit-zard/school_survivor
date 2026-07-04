# Science Flask Zone Damage Fix Validation - 2026-07-04

Focused RED/GREEN:

```bash
npm test -- src/components/Weapons/Flask.test.jsx
npm test -- src/lib/weaponTargeting.test.js
```

Result:
- RED: Flask projectile did not pass zone stats into the explosion payload.
- RED: `applyRadialDamage` hit an enemy when `radius` was missing.
- GREEN: Both regressions pass after the fix.

Related verification:

```bash
npm test -- src/lib/weaponCatalog.test.js -t scienceFlask
npm test -- src/components/Weapons/Flask.test.jsx src/lib/weaponTargeting.test.js src/lib/upgrades.test.js
npm run build
```

Result:
- Science Flask cooldown RED/GREEN: `2800ms` failed, `8400ms` passed.
- 3 test files passed, 33 tests passed.
- Production build passed. Vite reported existing large chunk/dynamic import warnings.

Known unrelated failure:
- `src/lib/weaponCatalog.test.js` currently expects 15 weapons, while the dirty workspace catalog contains 16 IDs including `studentLantern`.
