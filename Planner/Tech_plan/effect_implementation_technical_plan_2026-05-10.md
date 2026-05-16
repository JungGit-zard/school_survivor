# Effect Implementation Technical Plan

Date: 2026-05-10
Role: Planner + Developer technical planning
Scope: BangBang Survivor current R3F prototype effect/VFX implementation review and next implementation plan

## 1. Review Basis

This plan is based on the current implementation and project graphic rules in:

- `project_develop_policy.md`
- `Bang_Rules.md`
- `Developer/tech_stack.md`
- `Developer/r3f_prototype/src/components/Weapons.jsx`
- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/components/EnemyDeathCollapse.jsx`
- `Developer/r3f_prototype/src/components/ZombieMesh.jsx`
- `Developer/r3f_prototype/src/lib/toon.js`
- `Graphic_designer/toon_reference_implementation_summary.md`
- `Graphic_designer/threejs_toon_modeling_method.md`
- `Graphic_designer/color_palette_guide.md`
- `Graphic_designer/stage_graphic_cons.md`

## 2. Current Graphics Technology State

### Rendering Stack

The current game uses one React Three Fiber scene:

| Layer | Current technology | Role |
| --- | --- | --- |
| UI | React DOM | HUD, level-up cards, game state screens |
| Game state | Zustand | player, weapons, phase, elapsed time |
| 3D rendering | React Three Fiber + Three.js | player, enemies, weapons, drops, effects |
| Physics/hit detection | @react-three/rapier | player, enemies, projectiles, sensors |
| Materials | `MeshToonMaterial` + shared gradient map | toon/cel look |
| Outline | Back-side outline mesh material | readable silhouettes |

### Current Visual Strengths

- Player, enemies, weapons, pickups, and death effects are already 3D objects, not 2D sprites.
- `toon.js` provides a shared toon material path through `toonMat()` and `outlineMat()`.
- Weapon effects are already visible and gameplay-linked:
  - pencil projectile model
  - ruler swing trail
  - tumbler orbit ring
  - bell shockwave pulse
  - science flask projectile and explosion
  - guided missile flame/smoke/explosion
  - Starlink warning and lightning bolt
  - stun gun bolt and chain arc
  - onigiri bounce flash
- Enemy hit feedback exists through `ZombieMesh hitFlash`.
- Enemy death feedback exists through `EnemyDeathCollapse`, with block parts scattering or crumbling.

### Current Technical Weaknesses

1. Effects are implemented directly inside weapon/enemy components.
   - Example: `BellPulse`, `FlaskExplosion`, `StrikeWarning`, `StrikeBolt`, `ChainArcVisual`, `BounceFlash` all live in `Weapons.jsx`.
   - This is understandable for a prototype, but future weapons will increase file size and duplicate timing/material logic.

2. There is no central effect queue.
   - A central queue means a shared place where gameplay can request "spawn hit spark here" or "spawn warning circle here".
   - Currently each weapon owns its own temporary arrays with `useState`.

3. Effect colors are not fully centralized.
   - Some colors match the graphic guide, but many values are hardcoded in each component.
   - This makes global readability tuning harder.

4. Effect lifetime and maximum count are not centrally limited.
   - Dense waves can create many temporary meshes.
   - Current effects are mostly short-lived, but there is no explicit budget rule in code.

5. Gameplay hitbox and visual effect are partly coupled.
   - Rapier sensors are correctly used for many attacks, but the visual and collision logic often live in the same component.
   - For maintainability, visual effect should react to gameplay events, not become the collision truth.

6. Charge warning VFX for Stage 1 monsters is not separated as a reusable effect.
   - Stage 1 now emphasizes only chasing/charging monsters.
   - Charge warnings should become a core reusable Stage 1 danger effect.

## 3. Technical Direction

### Core Principle

Effects must communicate gameplay first, decoration second.

For this project, an effect is successful when the player can quickly understand:

- what happened,
- where it happened,
- whether it is dangerous,
- when damage will occur,
- and whether it belongs to the player or enemy.

### Required Style

- Use Three.js/R3F geometry-based effects for combat VFX.
- Keep toon style through flat colors, clear silhouettes, and controlled opacity.
- Use `MeshBasicMaterial` for flat transparent circles/rings/planes when lighting is unnecessary.
- Use `MeshToonMaterial` for physical effect props such as missile, flask, pencil, tumbler, bell, debris.
- Avoid realistic particles, bloom-heavy effects, and long smoke that hides the player.

## 4. Proposed Effect Architecture

### 4-1. Add A Shared VFX Layer

Create:

```text
Developer/r3f_prototype/src/components/VFXLayer.jsx
Developer/r3f_prototype/src/lib/vfxEvents.js
Developer/r3f_prototype/src/lib/vfxPalette.js
```

`VFXLayer.jsx` should be mounted once in `Game.jsx`, near weapons and enemies.

Recommended order:

```jsx
<Player />
<Weapons />
<VFXLayer />
<Enemies />
```

If an effect must appear above enemies, use `renderOrder` and material depth settings rather than moving gameplay ownership.

### 4-2. Use A Small Event Queue

Use a simple module-level event emitter or Zustand slice.

Recommended beginner-friendly option:

```js
// lib/vfxEvents.js
const listeners = new Set()

export function emitVfx(event) {
  listeners.forEach((fn) => fn({ ...event, id: crypto.randomUUID(), startMs: performance.now() }))
}

export function subscribeVfx(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
```

Why this is useful:

- Weapons can call `emitVfx({ type: 'hitSpark', x, z })`.
- `VFXLayer` owns rendering and cleanup.
- Weapon code stays focused on gameplay.

### 4-3. Define VFX Types

Initial VFX event types:

| Type | Purpose | Lifetime | Visual |
| --- | --- | --- | --- |
| `hitFlash` | Enemy was damaged | 80-120 ms | already handled in `ZombieMesh`; keep local |
| `hitSpark` | Weapon impact point | 180-260 ms | small toon star/cross burst |
| `deathBurst` | Enemy death accent | 500-800 ms | keep `EnemyDeathCollapse`, add optional small smoke puff later |
| `chargeWarningLine` | E05/B01 charge danger | 600-900 ms | orange translucent lane/arrow |
| `areaWarningCircle` | delayed area danger | 450-900 ms | ring + faint fill |
| `shockwaveRing` | bell/player radial attack | 400-600 ms | expanding ring |
| `splashCircle` | flask/missile explosion | 300-450 ms | green or pink expanding circle |
| `chainArc` | stun gun chain | 180-260 ms | jagged segmented line |
| `pickupPop` | XP/gold spawn feedback | 240-360 ms | tiny upward pop ring |
| `levelUpGlow` | player level-up | 900-1200 ms | blue-white vertical glow ring |

## 5. Color And Readability Rules

Use project palette as code constants:

```js
export const VFX_COLORS = {
  playerBlue: 0x59c7ff,
  xpGreen: 0x81b071,
  infectionFill: 0x41745a,
  infectionEdge: 0x95bf91,
  chargeOrange: 0xe99039,
  dangerRed: 0xd32836,
  bossDarkRed: 0x4f1b30,
  specialPurple: 0x693054,
  electricCyan: 0x96a5bc,
  stunYellow: 0xffe840,
  coinPink: 0xcea19d,
}
```

Rules:

- Player-owned effects should prefer blue, yellow, or clean green.
- Enemy danger warnings should prefer orange, red, or purple.
- XP/gold effects must not use the same warning colors as enemy attacks.
- Warning effects must appear before damage.
- Damage effects must be shorter than warning effects.
- No effect should cover the player for longer than 0.2 seconds.

## 6. Implementation Plan

### Phase 1. Inventory And Stabilize Current Effects

Goal: keep current visuals but make them easier to tune.

Tasks:

1. Create `vfxPalette.js`.
2. Replace hardcoded repeated VFX colors in `Weapons.jsx` with palette constants.
3. Add shared helper functions:
   - `easeOutCubic`
   - `smoothStep`
   - opacity fade helper
4. Keep current weapon effects in place until the shared layer exists.

Acceptance:

- No gameplay change.
- `npm run build` passes.
- Existing effects look the same or slightly clearer.

### Phase 2. Add `VFXLayer`

Goal: introduce a common rendering place without rewriting all weapons at once.

Tasks:

1. Add `VFXLayer.jsx`.
2. Add `vfxEvents.js`.
3. Implement three reusable effects first:
   - `hitSpark`
   - `chargeWarningLine`
   - `pickupPop`
4. Mount `VFXLayer` in `Game.jsx`.

Acceptance:

- Weapons/enemies can emit an effect without owning local React state.
- Effects self-remove after lifetime.
- Max active VFX count is capped.

Recommended cap:

```text
maximum active VFX events: 80
maximum active warning effects: 12
maximum active hit sparks: 40
```

### Phase 3. Stage 1 Charge/Danger Effects

Goal: support the revised Stage 1 rule: only chase/charge monsters, no projectile monsters.

Tasks:

1. Emit `chargeWarningLine` from E05 and B01 warning state.
2. The warning lane must match the actual charge direction.
3. Use orange for E05 and dark red/orange for B01.
4. Add a short enemy body shake while `animPhase === 'warn'`.
5. Add a brief dust/slam effect when charge ends.

Acceptance:

- Player can read the charge direction before damage.
- Warning duration matches `warnDuration`.
- Warning does not remain after the charge starts.
- Warning visual does not imply projectile firing.

### Phase 4. Migrate Weapon Effects Gradually

Goal: reduce `Weapons.jsx` size and standardize effect behavior.

Migration order:

1. `BounceFlash` -> `VFXLayer`
2. `ChainArcVisual` -> `VFXLayer`
3. `FlaskExplosion` -> `VFXLayer`
4. `BellPulse` -> `VFXLayer`
5. Starlink `StrikeWarning` / `StrikeBolt` -> later, because it includes delayed damage logic

Important rule:

- Do not move damage logic into VFX.
- VFX should show events. Gameplay components still decide damage timing.

### Phase 5. Optimization

Goal: keep dense waves readable and mobile-safe.

Tasks:

1. Memoize geometries shared by VFX.
2. Reuse materials through palette helpers where possible.
3. Add active effect caps.
4. Remove or skip low-priority effects when enemy count is high.
5. Consider instancing only after the simple system is stable.

Initial low-spec rule:

```text
if enemy count >= 70:
- keep warning effects
- keep player hit feedback
- reduce hit sparks by 50%
- skip decorative pickup pop
- keep death collapse only for elite/boss, or reduce normal death collapse frequency
```

## 7. File-Level Implementation Targets

| File | Planned change |
| --- | --- |
| `src/lib/vfxPalette.js` | Add shared color constants |
| `src/lib/vfxEvents.js` | Add simple VFX event emitter |
| `src/components/VFXLayer.jsx` | Render and clean temporary effects |
| `src/components/Game.jsx` | Mount `VFXLayer` |
| `src/components/Enemy.jsx` | Emit charge warning and charge end dust/slam |
| `src/components/Weapons.jsx` | Gradually replace local visual-only effects with `emitVfx` |
| `src/components/EnemyDeathCollapse.jsx` | Keep as specialized death effect, later add density throttle |
| `src/lib/toon.js` | Keep current toon material helper; optionally add effect material helpers |

## 8. QA Checklist

Functional checks:

- Effects spawn at the correct world position.
- Effects clean up after their lifetime.
- Warning effect appears before damage.
- Damage timing does not change when visual effects are disabled.
- Restarting the game removes all active effects.

Visual checks:

- Effects do not hide the player.
- Effects are readable at 720 x 1280 portrait.
- Player effects and enemy danger effects use clearly different colors.
- Stage 1 has no projectile-monster visual language.
- Charge warning direction matches actual charge direction.

Performance checks:

- 3-minute dense-wave situation remains playable.
- Effect count cap works.
- No permanent growth of state arrays.
- Build succeeds with no syntax error.

## 9. Immediate Recommendation

Do not redesign the whole renderer yet.

The current R3F/Three.js stack is valid for this project. The next best step is to add a small `VFXLayer` and event queue, then move only simple visual-only effects first. This keeps the solo beginner project manageable while preparing the codebase for more weapons, boss warnings, and mobile readability tuning.

