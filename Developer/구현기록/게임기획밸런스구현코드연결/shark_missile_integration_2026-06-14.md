# Shark Missile Integration - 2026-06-14

## Scope

Integrated the previously uncommitted Codex worktree `sharkMissile` weapon into the current integration worktree.

## Runtime Changes

- Added `sharkMissile` as a separate weapon id. It does not replace `guidedMissile`.
- Registered catalog stats:
  - damage: 30
  - cooldown: 14000ms
  - range: 28
  - radius: 1.8
  - speed: 8.5
  - retargetIntervalMs: 300
- Added upgrade cards:
  - `acquireSharkMissile`
  - `sharkMissileDamage`
  - `sharkMissileRadius`
- Wired `SharkMissileWeapon` into `Game.jsx` through `Weapons/index.js`.
- Added Stage 1 clear unlock evaluation before the run-end unlock diff is computed.

## Runtime Behavior

- Fires only while the game phase is `playing`.
- Targets dense zombie groups through `findSharkMissileClusterTarget`.
- Retargets during flight every `retargetIntervalMs`.
- Explodes at the missile's current position.
- Applies radial damage and knockback.

## Notes

The implementation was adapted onto the newer current codebase that already includes `chibiko`, so weapon count expectations are now 15 total weapons with 9 starter weapons.
