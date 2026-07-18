# Shark Missile Integration Validation - 2026-06-14

## Scope

Validated the integrated `sharkMissile` weapon after moving it from the Codex worktree into the current integration worktree.

## Checks

- `sharkMissile` exists in `WEAPON_CATALOG`.
- Damage is 2x `scienceFlask`: 30 vs 15.
- Cooldown is 5x `scienceFlask`: 14000ms vs 2800ms.
- Unlock paths:
  - Stage 1 clear once.
  - Total completed runs 8.
- Level-up card gate is Lv.8 after account unlock.
- HUD maps the shark missile upgrade icon.
- Dense-cluster targeting chooses grouped enemies over a nearer isolated enemy.
- `SharkMissileWeapon` is rendered from `Game.jsx`.

## Commands

```powershell
npm test -- weaponCatalog.test.js upgrades.test.js HUD.test.jsx sharkMissileTargeting.test.js useGameStore.sharkMissileUnlock.test.js
npm test -- --run
npm run build
```

## Results

- Targeted tests: 6 files, 62 tests passed.
- Full tests: 39 files, 238 tests passed.
- Production build: passed.
- Vite emitted the existing large chunk warning; this is not a build failure.
