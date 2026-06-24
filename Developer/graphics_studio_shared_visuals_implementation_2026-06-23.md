# Graphics Studio Shared Visuals Implementation

Date: 2026-06-23
Scope: Make Graphics Studio preview render the same visual components used by the game.

## Implementation Summary

- Added `PlayerVisual` and reused it in both `Player.jsx` and Graphics Studio.
- Added `EnemyVisual` and reused it in both `Enemy.jsx` and Graphics Studio.
- Added `EnemyProjectileVisual.jsx` and reused it in both the E04 projectile runtime and Graphics Studio.
- Added `FloorVisual` so the studio floor preview uses the same floor and stage object visual layer as the game.
- Exported `HitSpark`, `ChargeWarningLine`, and `PickupPop` from `VFXLayer.jsx` so Graphics Studio no longer uses hand-made VFX stand-ins.
- Exported the weapon model functions from the weapon runtime files and changed the studio weapon category from icon preview to model preview.
- Removed studio-only pickup scale wrappers. Small objects are inspected with closer cameras instead of inflated object scale.
- Switched studio preview lighting to the same main game lighting values.

## Remaining Intentional Exception

- `Extra Battery Upgrade Icon` remains an image preview because the game currently does not have a 3D runtime weapon model for that upgrade.

## Verification

- `npx.cmd vitest run src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx src/components/TitleScene3D.test.jsx --maxWorkers=1 --no-file-parallelism`
  - 3 files passed, 10 tests passed
- `npx.cmd vitest run --maxWorkers=1 --no-file-parallelism`
  - 56 files passed, 301 tests passed
- `npm.cmd run build`
  - Build completed successfully
