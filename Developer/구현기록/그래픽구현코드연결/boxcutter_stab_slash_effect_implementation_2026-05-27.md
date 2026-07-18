# Box Cutter Stab-Slash Effect Implementation

## Scope

- Implemented the approved all-angle stab-slash visual effect in `BoxCutter.jsx`.
- Preserved existing damage, targeting, cooldown, and boosted range behavior.

## Files

- `Developer/r3f_prototype/src/components/Weapons/BoxCutter.jsx`
  - Added `BoxCutterStrikeEffect`.
  - The effect uses `strike.facing` to orient all visual marks.
  - `strike` now stores `range` and `width` so the effect can match the current weapon stats.

## Behavior

- At attack start, a center thrust mark extends forward.
- During the pull/cut phase, two short symmetric side cut marks appear near the tip.
- The effect fades before the strike ends and unmounts with the existing strike lifecycle.
