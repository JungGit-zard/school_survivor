# Graphics Studio shared-runtime parity regression guard

Date: 2026-06-24 23:57 local
Task: `t_d91d87a4`
Role: Three_Mini / technical implementation

## Goal

Strengthen automated regression coverage so `GRAPHICS_STUDIO_CATALOG` entries with runtime visual preview intent cannot silently drift back to icon previews, studio-only stand-ins, placeholders, mocks, or approximation-only paths when real runtime 3D visuals/components exist.

Covered `previewKind` values:

- `player`
- `zombie`
- `weaponModel`
- `vfx`
- `projectile`
- `floor`

## Implementation

Updated `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`:

- Added explicit `runtimePreviewComponent` metadata for player, zombies, floors, VFX, projectile, and every non-exception weapon model.
- Added `runtimePreviewSource` where the render wrapper component differs from the visual source path:
  - Player catalog item still points at shared `components/PlayerMesh.jsx`, while runtime preview rendering is through shared `components/Player.jsx` / `PlayerVisual`.
  - Zombie catalog items still point at shared `components/ZombieMesh.jsx`, while runtime preview rendering is through shared `components/Enemy.jsx` / `EnemyVisual`.
- Added `components/Player.jsx` to the player `applyTargets` so runtime preview wrapper and mesh source are both documented.
- Kept `weapon-extra-battery` as `previewKind: 'image'` because no runtime 3D model exists yet.

Updated `Developer/r3f_prototype/src/lib/graphicsStudioConfig.test.js`:

- Strengthened the runtime parity guard so it now checks both exact shared source paths and exact runtime preview component names.
- Reads `src/components/GraphicsStudioPreview.jsx` during the test and verifies each protected catalog item's `runtimePreviewComponent` is actually referenced by the preview renderer.
- Verifies each protected runtime preview source exists on disk and is listed in `applyTargets`.
- Rejects catalog metadata that looks studio-only, placeholder, approximation, stand-in, or mock-like.
- Keeps the image-preview guard requiring `weapon-extra-battery` to be the only `previewKind: 'image'` entry.

## Verification

Command run from `Developer/r3f_prototype`:

```text
npm test -- src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx
```

Result:

```text
Test Files  2 passed (2)
Tests       10 passed (10)
```

Known non-failing test noise:

- `GraphicsStudio.test.jsx` still prints existing React `act(...)` environment warnings. They did not fail the tests.

## Visual policy notes

- No runtime rendering or gameplay visuals were changed by this task.
- No player/monster 2D sprite substitute, visible debug proxy, or studio-only character/monster stand-in was introduced.
- The new guard protects the 3D toon runtime parity path for player, zombies, weapon models, VFX, enemy projectile, and floors.
