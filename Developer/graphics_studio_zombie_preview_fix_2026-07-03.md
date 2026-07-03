# Graphics Studio zombie preview fix - 2026-07-03

## Cause

- Runtime E01-E06 zombies are rendered through `ZombieInstanceLayer`.
- Graphics Studio called `EnemyVisual` without that layer, so standard zombie previews selected correctly but had no body mesh.

## Fix

- Added `forceMesh` to `EnemyVisual`.
- Graphics Studio passes `forceMesh` for zombie catalog previews.
- Runtime gameplay remains on instanced zombie rendering.

## Verification

- `npm test -- src/components/GraphicsStudioPreview.test.js src/components/GraphicsStudio.test.jsx src/components/ZombieMesh.test.js`
- `npm run build`
- Screenshot: `Quaility_Assurance/screenshots/zombie-e01-studio-check-2026-07-03.png`
