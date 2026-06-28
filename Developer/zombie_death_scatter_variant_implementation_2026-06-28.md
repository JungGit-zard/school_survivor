# Zombie Death Scatter Variant Implementation - 2026-06-28

## Scope

- Added three extra strong-death scatter variants for zombie death fragments.
- Existing variants remain: `burst`, `spiral`, `wave`.
- New variants:
  - `ring`: wider circular burst.
  - `fountain`: taller upward pop with compact spread.
  - `cross`: four-direction sharp fragment rays.

## Files

- `Developer/r3f_prototype/src/lib/enemyDeathCollapse.js`
- `Developer/r3f_prototype/src/lib/enemyDeathCollapse.test.js`

## Verification

- `npm test -- enemyDeathCollapse.test.js`: passed, 16 tests.
- `npm test -- enemyDeathCollapse.test.js GraphicsStudio.test.jsx graphicsStudioConfig.test.js`: passed, 27 tests.
