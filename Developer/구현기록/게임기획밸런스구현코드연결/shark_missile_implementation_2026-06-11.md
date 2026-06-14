# Shark Missile Implementation - 2026-06-11

## Scope

Added `sharkMissile` as a new high-tier weapon rather than replacing `guidedMissile`.

## Code Changes

- Catalog: `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- Upgrade cards: `Developer/r3f_prototype/src/lib/upgrades.js`
- HUD card/icon mapping: `Developer/r3f_prototype/src/components/HUD.jsx`
- Runtime component: `Developer/r3f_prototype/src/components/Weapons/SharkMissile.jsx`
- Targeting helper: `Developer/r3f_prototype/src/lib/sharkMissileTargeting.js`
- Game scene wiring: `Developer/r3f_prototype/src/components/Game.jsx`
- Icon asset: `Developer/r3f_prototype/src/assets/weapon_icon/14_wea_shark_missile.svg`

## Runtime Behavior

- Fires only when `weapons.sharkMissile.active` and the game phase is `playing`.
- Uses `findBestSplashTarget(range, radius)` at launch.
- Re-runs the same dense-cluster targeting every `retargetIntervalMs` while flying.
- Explodes at the missile's current position on arrival or timeout.
- Applies radial damage with stronger knockback than the basic missile.

## TDD Coverage

- `weaponCatalog.test.js`: count, stats, unlock conditions, valid id.
- `upgrades.test.js`: acquire, damage, and radius cards.
- `HUD.test.jsx`: weapon icon mapping.
- `useGameStore.sharkMissileUnlock.test.js`: Stage 1 clear unlock, total run fallback, level-up card access.
- `sharkMissileTargeting.test.js`: verifies dense cluster targeting beats a nearer isolated zombie.
