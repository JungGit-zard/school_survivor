# Zombie Movement Code Review - 2026-05-03

## Scope

- Reviewed zombie spawn, movement, contact damage, ranged movement, charge movement, and related shared position state.
- Main files:
  - `Developer/r3f_prototype/src/components/Enemies.jsx`
  - `Developer/r3f_prototype/src/components/Enemy.jsx`
  - `Developer/r3f_prototype/src/components/Player.jsx`
  - `Developer/r3f_prototype/src/lib/refs.js`
  - `Developer/r3f_prototype/src/App.jsx`

## Current Structure

- `Enemies.jsx` owns enemy list state and spawn rules.
- `Enemy.jsx` owns one zombie's per-frame movement and attacks.
- `Player.jsx` writes the current player position into shared `playerPos`.
- `refs.js` exposes shared runtime references such as `playerPos` and `enemyBodies`.
- `App.jsx` runs Rapier physics with zero gravity and remounts the physics tree when `gameKey` changes.

## Movement Behavior Found

### Spawn Movement Setup

- Normal enemies spawn in a ring around the current player position.
- Spawn radius:
  - Normal enemies: 8.5 to 12.5 units.
  - Ranged E04: 11.5 to 15.5 units.
- Boss B01 spawns at 240 seconds.
- Continuous population maintenance runs every 600 ms and spawns up to 4 enemies per check until each phase target is reached.

### Basic Chase Enemies

- E01, E02, E03, and E06 directly chase the player.
- Per frame:
  - Read rigid body translation.
  - Compute direction to `playerPos`.
  - If inside contact distance, stop and damage player every 500 ms.
  - Otherwise normalize direction and call `setLinvel`.

### Ranged Enemy E04

- E04 keeps a preferred distance band.
- If too close, it moves away from the player.
- If too far, it moves toward the player.
- If inside the preferred band, it stops and fires a projectile.

### Charger Enemies E05 and B01

- Charger state machine:
  - `chase`: follows player.
  - `warn`: stops and locks the charge direction.
  - `charge`: moves in the locked direction.
  - `stun`: stops briefly, then returns to chase.
- B01 also fires fan projectiles while in chase state.

## Findings

### Medium: Charger Facing Was Not Updated During Warn/Charge/Stun

- Location: `Developer/r3f_prototype/src/components/Enemy.jsx`, charger state machine.
- Symptom reported: red charger zombie sometimes looked sideways or away from the player while stopping and charging.
- Cause: rotation was updated during `chase`, but `warn`, `charge`, and `stun` kept using the previous visual rotation.
- Fix applied: the charger now keeps facing its locked charge direction during warning and charge, then turns back toward the player during stun.

### Medium: Charger State Can Carry Across Game Reset If Component Identity Survives Unexpectedly

- Location: `Developer/r3f_prototype/src/components/Enemy.jsx`, charge refs around lines 103-107.
- The current reset strategy remounts the Physics tree through `gameKey`, so normal restart should clear the refs.
- Risk remains low in the current app, but if enemies are ever reset without remounting the component tree, `chargeState`, `stateTimer`, and `chargeDir` can keep old state.
- Suggested guard for future refactors: reset charge refs when `id` or `type` changes.

### Low: Ranged Enemy Rotation Uses Repeated Length Calculation

- Location: `Developer/r3f_prototype/src/components/Enemy.jsx`, around lines 195-208.
- E04 calculates `_dir.length()` multiple times in the same frame.
- This is not a visible bug, but it is slightly wasteful and easier to misread.
- Suggested cleanup: store `const dirLen = _dir.length()` before movement/rotation decisions.

### Low: Movement Comments Are Mojibake In Several Files

- Location: `Enemy.jsx`, `Enemies.jsx`, `Player.jsx`, `refs.js`.
- Some Korean comments are encoding-corrupted.
- Behavior is unaffected, but movement logic is harder for a beginner to maintain.
- Suggested cleanup: rewrite comments near enemy movement state machine and spawn rules in clear Korean.

## Remaining Movement Risk

- Basic chase, ranged keep-distance, charge warning/charge/stun, boss fan attack, and contact damage all have clear execution paths.
- `dist === 0` is unlikely because enemies spawn away from the player, and Three.js zero-vector normalize does not appear to create a crash path here.
- Physics pause is aligned with game phase because `Physics` is paused when phase is not `playing`, and movement frames also gate on `phase`.

## Suggested Next Improvements

- Add mild separation/avoidance so zombies do not visually stack into one clump.
- Add movement variation per enemy instance, such as small speed jitter or curved approach, to reduce identical movement.
- Rewrite corrupted comments in the movement files before larger enemy AI changes.

