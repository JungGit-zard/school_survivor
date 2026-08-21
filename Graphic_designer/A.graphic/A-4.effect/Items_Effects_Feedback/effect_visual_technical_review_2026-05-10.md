# Effect Visual Technical Review

Date: 2026-05-10
Role: Graphic designer record
Related planning document: `Planner/effect_implementation_technical_plan_2026-05-10.md`

## 1. Current Visual Direction Confirmed

- Effects should support the current Three.js toon/cel style.
- Player and monster visuals must stay 3D.
- Combat effects may use flat transparent geometry such as rings, circles, planes, and simple segmented lines.
- Effects must stay readable in mobile portrait play.
- Warning effects are more important than decorative impact effects.

## 2. Current Effect Coverage

Already present in the R3F prototype:

- enemy white hit flash
- zombie block collapse death effect
- ruler swing trail
- tumbler orbit ring
- bell shockwave
- science flask explosion circle
- guided missile flame/smoke/explosion
- Starlink warning and lightning strike
- stun gun chain arc
- onigiri bounce flash

## 3. Visual Risks

- Too many local hardcoded colors make later palette tuning difficult.
- Some player weapon effects and enemy danger effects can compete for screen attention.
- Dense waves may make repeated hit flashes, death collapses, and impact bursts visually noisy.
- Stage 1 now excludes projectile monsters, so charge warning readability becomes more important than projectile warning readability.

## 4. Visual Rules For New Shared VFX

- Player-owned effect colors: blue, clean yellow, clean green.
- Enemy danger effect colors: orange, red, purple.
- XP/gold feedback colors must not look like enemy warnings.
- Keep opacity low for area fills and higher for outlines/rings.
- Use short lifetimes:
  - hit spark: 0.18-0.26s
  - explosion circle: 0.30-0.45s
  - charge warning: same as enemy `warnDuration`
  - level-up glow: 0.9-1.2s
- Avoid long full-screen flashes.

## 5. Visual Acceptance Criteria

- The player remains visible while any effect is playing.
- Charge warning lane shows actual charge direction before damage.
- Warning color and player attack color are distinguishable within one second.
- VFX does not look like debug rings.
- Effect silhouettes stay simple and readable over the school floor.

