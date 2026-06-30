# Far Death Fragment Fade Implementation - 2026-06-30

## Changes

- Added early fade metadata for wide-tier scatter fragments.
- Added `resolveCollapsePartOpacity` so far fragments can fade before the shared collapse fade.
- Updated `EnemyDeathCollapse` to apply per-fragment opacity every frame.
- Added unit coverage for far scatter fade timing.

## Verification

- `npm test -- enemyDeathCollapse.test.js` passed.
- `npm run build` passed.

