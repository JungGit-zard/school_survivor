# threemini critical hit visual feedback implementation note — 2026-08-09

## Scope
- Kanban task: `t_d07716b0`
- Project: Escape! zombie school
- Implementation boundary: pooled critical damage-number presentation only.

## Technical decision
- Kept the existing fixed-slot pooled `DamageNumbersLayer` architecture.
- Added per-slot `criticalScale` state instead of per-hit React mounts, timers, new dependencies, or unbounded allocations.
- `computeDamageNumberFrame()` multiplies the existing pop scale by `slot.criticalScale`; default/reset value is `1`, preserving ordinary damage numbers.
- `shouldRenderDamageNumber(event)` preserves reduced-effects suppression for normal numbers while allowing `event.isCritical === true` through for required critical feedback.
- `DamageNumbersLayer` now falls back to `DAMAGE_NUMBER_COLORS.critical` for critical events without explicit `colorHex`.

## Files changed
- `Developer/r3f_prototype/src/lib/damageNumbers.js`
- `Developer/r3f_prototype/src/components/DamageNumbersLayer.jsx`

## Files restored / intentionally unchanged
- `Developer/r3f_prototype/src/lib/damageNumbers.test.js` restored to pre-task HEAD contents and left unchanged in final scoped diff per user override.

## Verification boundary
- No tests, builds, browser runs, QA runs, or `git diff --check` were executed after the user override.
- Only scoped diff reading was performed to confirm the final affected files.
