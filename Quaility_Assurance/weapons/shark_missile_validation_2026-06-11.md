# Shark Missile Validation - 2026-06-11

## Scope

Validated the new `sharkMissile` weapon implementation, unlock rule, upgrade cards, icon mapping, and runtime build.

## Requirements Checked

- Cooldown is 5x `scienceFlask`: 14000ms vs 2800ms.
- Damage is 2x `scienceFlask`: 30 vs 15.
- Account unlock condition is Stage 1 clear once or total 8 completed runs.
- Level-up card appears from Lv.8 after account unlock.
- Dense-cluster targeting chooses a zombie group over a nearer isolated zombie.
- Weapon is wired into the game scene through `SharkMissileWeapon`.
- Visual uses the low-poly shark missile concept and toon/outlined three.js geometry.

## Commands

```powershell
npm.cmd test -- --run src/lib/weaponCatalog.test.js src/lib/upgrades.test.js src/components/HUD.test.jsx src/store/useGameStore.sharkMissileUnlock.test.js --pool=threads
npm.cmd test -- --run src/lib/sharkMissileTargeting.test.js --pool=threads
npm.cmd run build
npm.cmd test -- --run --pool=threads
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5179 -TimeoutSec 10
```

## Results

- Targeted tests: 5 files, 52 tests passed.
- Production build: passed. Vite emitted the existing large chunk warning.
- Full tests: 38 files, 228 tests passed.
- Dev server smoke check: `http://127.0.0.1:5179` returned HTTP 200 and served `/src/main.jsx`.

## Browser Note

The Codex in-app browser backend reported `iab` unavailable during this run, so visual inspection could not be completed through the browser tool. Build and HTTP smoke verification were completed instead.
