# Gameplay Visual Audio Tuning Validation - 2026-07-04

Focused RED/GREEN test command:

```bash
npm test -- src/components/Enemies.test.jsx src/lib/weaponTargeting.test.js src/lib/weaponCatalog.test.js src/lib/upgrades.test.js src/components/Weapons/EraserBomb.test.jsx src/lib/sfxRegistry.test.js
```

Result:
- RED before implementation: 7 expected failures across boss scale, shatter style forwarding, Matilda SFX rate support, Onigiri damage values, and Eraser Bomb model scale.
- GREEN after implementation: 6 test files passed, 69 tests passed.

Final verification:

```bash
npm test -- src/components/Enemies.test.jsx src/components/ZombieMesh.test.js src/lib/weaponTargeting.test.js src/lib/weaponCatalog.test.js src/lib/upgrades.test.js src/components/Weapons/EraserBomb.test.jsx src/lib/sfxRegistry.test.js
npm run build
npx vitest run --maxWorkers=1 --testTimeout=30000
```

Result:
- Focused suite: 7 test files passed, 73 tests passed.
- Production build: passed. Vite reported existing large chunk/dynamic import warnings.
- Full serial suite: 73 test files passed, 399 tests passed.

Additional Matilda girl-voice tuning:

```bash
npm test -- src/components/Enemies.test.jsx src/lib/sfxRegistry.test.js
npm run build
```

Result:
- Matilda spawn audio suite: 2 test files passed, 20 tests passed.
- Production build: passed. Vite reported existing large chunk/dynamic import warnings.

Complete Matilda spawn sound replacement:

```bash
npm test -- src/components/Enemies.test.jsx src/lib/sfxRegistry.test.js
npm run build
```

Result:
- Matilda spawn now plays the replaced `matildaSpawn.ogg/.mp3` asset.
- Focused suite: 2 test files passed, 20 tests passed.
- Production build: passed. Vite reported existing large chunk/dynamic import warnings.
