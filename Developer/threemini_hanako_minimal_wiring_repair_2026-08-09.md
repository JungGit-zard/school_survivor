# threemini Hanako minimal wiring repair — 2026-08-09

## Scope
- Kanban task: `t_ff24f4c8`
- Project: Escape! zombie school
- Boundary: Hanako companion/weapon visual wiring for Graphics Studio preview/catalog only; no normal weapon catalog entry and no upgrade acquisition flow.

## Technical decisions
- Kept `HanakoModel` / `HanakoWeapon` source and runtime mount intact.
- Registered Graphics Studio catalog ID `weapon-hanako` with icon `15_wea_hanako.svg`, source `components/Weapons/Hanako.jsx`, preview kind `weaponModel`, and runtime preview component `HanakoModel`.
- Added `HanakoModel` to `GraphicsStudioPreview.jsx` weapon-model preview branch for `type === 'hanako'`.
- Removed Hanako from `WEAPON_CATALOG` and removed the temporary `acquireHanako` upgrade path so Hanako does not enter normal weapon selection/acquisition.
- Preserved Firebase-runtime-only Graphics Studio storage behavior.

## Verification
- `npm test -- --run src/lib/graphicsStudioConfig.test.js src/lib/graphicsStudioStageLock.test.js src/components/Weapons/Hanako.test.jsx src/lib/hanako.test.js src/lib/weaponCatalog.test.js src/lib/upgrades.test.js`
- Result: 6 test files passed, 94 tests passed.

## 2026-08-09 finalize note — t_e30aaf89
- Provenance retained: original Hanako source/icon work came from Three_Mini card `t_f99fe441`; this record remains the technical continuation record for Hanako final wiring.
- Removed the temporary `Developer/r3f_prototype/tmp-apply-hanako-preview.cjs` helper from the prior repair path.
- Tightened `Hanako.test.jsx` so the Hanako source contract no longer reads `weaponCatalog.js` or `upgrades.js` and no longer asserts `not.toContain(...)` against gameplay upgrade/catalog files.
- Preserved the exact existing E07 Studio mapping: `if (type === 'E07') return 'zombie-procedural-face-test'`.
