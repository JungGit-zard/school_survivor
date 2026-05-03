# BangBang Survivor Prototype Implementation Notes

## Active Prototype

Location:

```
Developer/r3f_prototype/
```

Dev server: `npm run dev` → `http://localhost:5173`

Main files:

```
src/main.jsx
src/App.jsx
src/store/useGameStore.js
src/lib/refs.js
src/lib/toon.js
src/components/Game.jsx
src/components/Floor.jsx
src/components/Player.jsx
src/components/PlayerMesh.jsx
src/components/Enemy.jsx
src/components/Enemies.jsx
src/components/Weapons.jsx
src/components/HUD.jsx
```

## Stack Change from Previous Prototype

| Before (school_survivor_prototype) | After (r3f_prototype) |
|---|---|
| Phaser 4 (game logic) | @react-three/rapier (physics + collision) |
| Three.js overlay canvas | @react-three/fiber (single R3F scene) |
| CDN scripts | Vite + npm modules |
| Phaser ↔ Three.js coordinate bridge | Eliminated (one coordinate system) |
| Two-canvas architecture | One Canvas, React DOM HUD overlay |

**Reason for change**: The two-canvas Phaser + Three.js approach required manual coordinate mapping between Phaser world space and Three.js screen space. During camera movement the player sprite and 3D character mesh drifted apart. A unified R3F scene eliminates the sync problem entirely.

## Required Documents Followed

- `CEO/Game_service_purpose_target.md`
- `CEO/game_cons_techstack` (stack updated)
- `Planner/bangbang_main_contents_plan_ai_ready.readable.md`
- `Graphic_designer/graphic_design_agent_notes.md`
- `Graphic_designer/stage_graphic_cons.md`

## Architecture

### Responsibility Map

| System | Component / Module |
|---|---|
| Canvas root | App.jsx |
| Physics world | @react-three/rapier Physics (gravity [0,0,0]) |
| Keyboard input | @react-three/drei KeyboardControls |
| Game loop | useFrame inside Game.jsx, Player.jsx, Enemy.jsx, Weapons.jsx |
| Game state | zustand useGameStore (player, weapons, phase, elapsedMs, bossSpawned) |
| Player physics | Player.jsx — RigidBody dynamic + CuboidCollider |
| Player visual | PlayerMesh.jsx — BoxGeometry toon parts + walk animation |
| Enemy AI | Enemy.jsx — velocity-based chase via setLinvel |
| Enemy wave | Enemies.jsx — time-scaled spawner with type escalation |
| Weapons | Weapons.jsx — PencilThrow (RigidBody sensor projectiles) + SchoolBagSwing (melee sweep sensor) + TumblerOrbit (orbiting contact sensor) |
| HUD | HUD.jsx — React DOM fixed overlay |
| World | Floor.jsx — planeGeometry floor + invisible boundary RigidBody walls |
| Cross-frame position | lib/refs.js — playerPos THREE.Vector3 (no zustand, no re-renders) |
| Toon material | lib/toon.js — singleton 4-band neutral-gray CanvasTexture |

### Camera

- OrthographicCamera, zoom 80
- Positioned [0, 20, 20], looks at player XZ
- Smooth follow via `camera.position.lerp(target, 0.08)` in Game.jsx useFrame

### Coordinate System

- Y-up (Three.js standard)
- Movement plane: XZ (no gravity)
- Player feet at y ≈ −1.2, head at y ≈ 1.4

## Current Gameplay Loop

Implemented:

- WASD / Arrow key movement with normalized diagonal speed
- Player RigidBody with `lockRotations`, `linearDamping: 10`
- Mesh rotation toward movement direction (atan2 lerp)
- Auto `PencilThrow` — multi-directional rotating projectiles with pierce
- `SchoolBagSwing` — short close-range bag sweep that damages touched enemies
- `TumblerOrbit` — always-on orbiting tumbler that damages enemies on contact
- Wave spawner — grunt / fast / tank / boss escalating by elapsed time
- Enemy AI — velocity-based chase, contact damage on distance < 0.8
- HP / invulnerability system — 520ms iframes after taking damage
- XP gain on enemy death, level-up at XP threshold
- Level-up upgrade modal — 3 random choices from 11 upgrades
- Boss spawn at 3 minutes (prototype; 5 minutes in full version)
- Stage clear at 3 minutes
- Game over on HP = 0
- HUD: HP bar, XP bar, timer, level indicator, active weapon chips

## Enemy Types

| Type | Internal Key | HP | Speed | Damage | XP |
|---|---|---|---|---|---|
| InfectedStudent | grunt | 30 | 2.2 | 8 | 1 |
| FrenzyRunner | fast | 16 | 4.0 | 5 | 1 |
| InfectedPETeacher | tank | 100 | 1.2 | 16 | 3 |
| InfectedPrincipal | boss | 600 | 1.8 | 22 | 20 |

## Weapon System

| Weapon | Type | Trigger |
|---|---|---|
| PencilThrow | Rotating projectile (RigidBody sensor) | Auto, cooldown-based |
| SchoolBagSwing | Moving melee sensor (kinematicPosition) | Auto, cooldown-based swing |
| TumblerOrbit | Orbiting ball sensor (kinematicPosition) | Auto, hitsPerSecond-based contact |
| EmergencyBell | 8-directional shockwave | Planned (not yet implemented) |
| ElectricStunGun | Chain lightning | Planned (not yet implemented) |

## Upgrade Tree (11 options)

- pencilDamage — +6 damage
- pencilCount — +1 projectile (max 4)
- pencilPierce — +1 pierce (max 3)
- bagDamage — +8 damage
- bagRadius — +0.5 radius (max 6)
- unlockBell — activate EmergencyBell
- bellDamage — +10 bell damage
- unlockStun — activate ElectricStunGun
- stunChain — +1 chain count (max 4)
- moveSpeed — +10% movement speed
- maxHealth — +20 max HP and current HP

## Player Visual (PlayerMesh.jsx)

Block-geometry toon student character:

- Head: skin-tone (#ffc39b)
- Hair top/sides: pink (#ff7096), darker tail (#d94070)
- Hair clip: white
- Eyes: deep pink (#d94070)
- Body: red oversized hoodie (#d42020)
- Shirt panel: white
- Belt: yellow (#ffd100)
- Skirt: blue denim (#4a90d9)
- Backpack: cyan (#38c8f0) with navy pocket
- Shoulder straps: navy vertical bars
- Arms/sleeves: red (oversized)
- Hands: skin-tone
- Legs: white stockings (#ebebf2)
- Shoes: gray (#8090a8) with dark sole (#4a5566)

Animation (useFrame):
- Arm swing: `Math.sin(t * 7.5) * 0.22` on rotation.z
- Head/hair bob: `Math.sin(t * 5.5) * 0.04` on position.y
- Leg swing at 0.5× arm amplitude
- Bag sway at 5.5 Hz

## Material System (lib/toon.js)

```javascript
// 4-band neutral-gray gradient (no color tinting)
['#484848', '#909090', '#d4d4d4', '#ffffff']

// Per block: MeshToonMaterial + BackSide outline mesh + EdgesGeometry line
```

## Validation Performed

- npm install completed (142 packages, 0 errors)
- Vite dev server starts on http://localhost:5173
- All component files created and cross-import verified

## Remaining Validation Needed

- Browser runtime test (Canvas renders, physics runs)
- Player movement feel — speed / damping tuning
- Enemy spawn rate and wave balance play-test
- Weapon projectile sensor hit detection in-browser
- Level-up modal blocks input correctly when `phase === 'levelup'`
- 60 FPS check at 40+ simultaneous enemies
- Mobile 9:16 viewport scaling check
- Touch drag input implementation (currently keyboard only)

## Known Risks

- Rapier sensor `onIntersectionEnter` fires once; re-entry events require `activeEvents` config — verify in browser.
- `Enemies.jsx` uses `useRef` array mutated inside `useFrame` — React does not re-render on mutation; enemy removals rely on `onDeath` callback to call `setProjectiles` (verify pattern matches Enemy removal).
- `pickThree(level)` in HUD.jsx re-shuffles on every render during levelup phase — wrap in `useMemo` keyed by phase + level if flicker is observed.
- SchoolBagSwing and TumblerOrbit use `kinematicPosition` + `setTranslation` in useFrame — verify Rapier update timing does not lag one frame behind player position.

## Next Recommended Development Steps

1. Open http://localhost:5173 and confirm scene renders
2. Verify player moves and enemies spawn / chase
3. Verify PencilThrow projectiles kill enemies and damage numbers apply
4. Verify level-up modal pauses game and upgrade applies
5. Tune ENEMY_STATS speeds and spawn interval curve
6. Add XP orb drop visual on enemy death
7. Implement EmergencyBell and ElectricStunGun weapons
8. Add heal orb drop from tank / boss
9. Add mobile touch drag movement
10. Add VFX: hit flash (emissiveIntensity pulse), death particle burst
11. Profile at 80+ enemies, add instancing if needed
12. Implement boss special attack pattern

---

## Deprecated Prototype (school_survivor_prototype)

Location: `Developer/school_survivor_prototype/`

Status: **Deprecated — superseded by r3f_prototype**

The old prototype used Phaser 4 + Three.js overlay canvas. It established the game loop concept and enemy/weapon naming conventions that carry forward into the R3F prototype. It should not be developed further.

---

## 2026-04-26 Enemy Size and Pencil Hitbox Adjustment

- Doubled enemy visual scale through `ENEMY_SIZE_MULTIPLIER = 2`.
- Doubled enemy Rapier `CuboidCollider` scale by applying the same multiplier to collider args.
- Applied the same multiplier to enemy spawn height so the larger collider rests at the expected gameplay height.
- Doubled distance-based enemy contact checks to match the larger monster size.
- Increased PencilThrow sensor collider from `[0.026, 0.026, 0.116]` to `[0.06, 0.06, 0.16]`.
- Enabled `ccd` on PencilThrow projectile rigid bodies to reduce missed hits at high projectile speed.

## 2026-04-26 Pause Toggle

- Added `togglePause()` to the game store.
- Bound the `P` key in `HUD.jsx` so it toggles `playing` and `paused`.
- Passed `paused={phase !== 'playing'}` to the Rapier `Physics` component so the physics simulation stops during pause, level-up, game over, and clear states.

## 2026-04-26 Enemy Death Collapse

- Added `EnemyDeathCollapse.jsx`.
- Enemy death now passes the enemy type, position, and visual scale into the death callback.
- `Enemies.jsx` spawns a short-lived collapse effect when an enemy dies.
- The collapse effect creates separate Rapier dynamic rigid bodies for head, body, arms, and legs.
- Each part receives initial linear and angular velocity so the monster breaks apart and tumbles briefly before cleanup.

## 2026-04-26 Pencil Single-Shot Fix and Floor Grid Density

- Fixed PencilThrow so it always creates one projectile per cooldown.
- Removed `pencilCount` from the level-up choice pool so the player cannot accidentally enable multi-shot behavior.
- Removed the `pencilCount` upgrade application path and added an active-projectile guard so only one pencil can exist on screen at once.
- Increased floor grid density by 4x by drawing grid lines every `TILE_SIZE / 4` instead of every full tile.
- Build verification completed with `npm run build`.

## 2026-04-26 Death Debris Cleanup

- Changed enemy death collapse cleanup from about 1.35 seconds to exactly 1 second.
- Build verification completed with `npm run build`.

## 2026-04-26 Player Shadow and Debris Stability

- Added a flat circular shadow under the player feet only.
- The shadow is a simple local mesh attached to the player model, not a global scene shadow system.
- Death debris no longer uses active colliders, so passing enemies do not physically destabilize the debris effect.
- Death debris materials now render behind live enemies by using lower render order and disabled depth testing.
- Build verification completed with `npm run build`.

## 2026-04-26 Zombie Scale and Death Debris Color Revision

- Reduced `ENEMY_SIZE_MULTIPLIER` from `2` to `4 / 3`, making current zombies two-thirds of their previous size.
- The same multiplier still drives enemy collider size, spawn height, contact distance, HP bar placement, and death debris scale.
- Brightened death debris body materials with stronger emissive color so broken zombie parts no longer read as plain black.
- Reduced death debris outline opacity and outline scale so the colored zombie palette remains visible.

## 2026-04-26 Player Ellipse Shadow

- Changed the player foot shadow from a flat circle to a smaller horizontal ellipse.
- Kept the shadow attached to the player mesh so it follows the same gameplay position as the 3D protagonist.

## 2026-04-26 Player Size Reduction

- Reduced the player 3D model scale from `0.333` to `0.2664`, which is four-fifths of the previous size.
- Reduced the player collider and rigid body height by the same four-fifths ratio so visual size and hit area stay aligned.

## 2026-04-26 Player Shadow Visibility Fix

- Moved the player ellipse shadow upward so it sits above the floor plane after the player size reduction.
- Increased shadow opacity and local ellipse scale so the shadow remains visible under the smaller protagonist.

## 2026-04-26 Pencil Multi-Shot Bug Fix

- Found that `PencilThrow` still appended a new projectile every cooldown even when an earlier pencil was alive.
- Added an active projectile ref guard so only one pencil projectile can exist at a time.
- Synchronized the active projectile ref during both projectile creation and expiry to avoid stale React state during `useFrame`.

## 2026-04-26 Bag Swing and Tumbler Orbit Weapons

- Replaced the old always-on `SchoolBagAura` with `SchoolBagSwing`.
- `SchoolBagSwing` now performs a short melee sweep in front of the player, moves a visible 3D bag model along the sweep arc, and damages each touched enemy once per swing.
- Added `TumblerOrbit`, a separate always-on orbiting weapon that circles the player at radius `2.0`, which is two-thirds of the old bag aura radius `3.0`.
- The tumbler uses a moving sensor collider and deals repeated contact damage to enemies touching the orbiting tumbler.
- Updated `Game.jsx`, weapon store defaults, and HUD active weapon display for the new weapon split.
- Build verification completed with `npm run build`.

## 2026-04-26 Bag Trigger and Tumbler Size Tuning

- Reduced the tumbler model scale and contact collider radius by half.
- Added a close-range detection sensor to `SchoolBagSwing`.
- The bag swing now auto-triggers only when at least one enemy is inside the close trigger range.
- Added a translucent sweep trail during bag attacks to make the motion read like a melee weapon swing.
- Build verification completed with `npm run build`.

## 2026-04-26 Bag Swing Blackout Fix

- Found a Rapier runtime crash after bag swings: `expected instance of EA` during collider removal.
- Stopped mounting and unmounting the bag swing damage rigid body per swing.
- The damage rigid body and collider now stay mounted and move to an offscreen position while inactive.
- Changed bag hit handling so collision callbacks only queue hits; actual enemy damage is applied in `useFrame`.
- This avoids deleting enemy rigid bodies directly inside a Rapier collision callback.
- Build verification completed with `npm run build`.

## 2026-04-26 Bag Swing Arm Motion and Size Tuning

- Added shared `bagSwingState` so the weapon swing can drive the player mesh animation.
- The player right arm now swings during `SchoolBagSwing`, with the left arm adding a small counter motion.
- Reduced the visible swinging bag model scale from `0.7` to `0.35`.
- Build verification completed with `npm run build`.
