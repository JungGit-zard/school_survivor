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

## 2026-08-09 right-down-return implementation update
- Kanban task: `t_0bdce653`.
- `GameplayScreen.jsx` whole-screen critical animation now uses only four WAAPI keyframes: origin, right, down, origin.
- Added a `y` amplitude constant (`strong ? 5 : 3`) beside existing `x` (`strong ? 9 : 6`), preserving the current `durationMs` contract and `scale(1)` at all keyframes.
- Scope exclusions: sound, damage, critical chance, title, Firebase, tests, builds, browser checks, commits, and pushes.
