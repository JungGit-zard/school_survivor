# Auto-deploy graphics implementation handoff — Stage 1 visual loop

Date: 2026-06-24 23:42 local
Task: `t_79cf323b`
Role: Three_Mini / technical handoff

## Summary

This handoff accompanies `Graphic_designer/auto_deploy_graphics_audit_2026-06-24.md` and records the technical paths, test results, and recommended next implementation cards from the graphics audit.

No runtime code was changed by this handoff. The current working tree already contained many uncommitted graphics changes before this audit.

## Technical paths inspected

Core toon rendering:

- `Developer/r3f_prototype/src/lib/toon.js`
  - `toonMat()` uses `THREE.MeshToonMaterial` with gradient map.
  - `outlineMat()` uses BackSide inverted-hull outline with stencil `NotEqual` handling.
  - `inflateScale()` centralizes outline thickness inflation.

Player:

- `Developer/r3f_prototype/src/components/Player.jsx`
  - Exports `PlayerVisual` for reuse in Graphics Studio.
  - Renders visual inside the player `RigidBody`, preserving coordinate alignment.
- `Developer/r3f_prototype/src/components/PlayerMesh.jsx`
  - Exports `PLAYER_MESH_LAYOUT`.
  - Uses toon/outline materials for 3D body/head/hair/limbs.
  - Recent layout keeps head/hair/eyes tied to shared base head Y plus bob.
- `Developer/r3f_prototype/src/components/PlayerMesh.test.js`
  - Focused guard exists and passed.

Enemies:

- `Developer/r3f_prototype/src/components/Enemy.jsx`
  - Exports `ENEMY_STATS` and `EnemyVisual` for studio/runtime parity.
  - Runtime uses `ZombieMesh`, not sprites.
  - `EnemyProjectileVisual` is shared for E04 projectile visuals.
- `Developer/r3f_prototype/src/components/ZombieMesh.jsx`
  - 3D toon block zombie model with per-type palettes, hit flash, walk/charge/stun animation.
- `Developer/r3f_prototype/src/components/EnemyProjectileVisual.jsx`
  - New shared toon projectile visual.

Floor / stage visuals:

- `Developer/r3f_prototype/src/components/Floor.jsx`
  - Exports `FloorVisual` for classroom/corridor floor + stage object visuals.
  - Physics floor/walls are invisible meshes only.

Graphics Studio:

- `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`
  - Imports shared runtime components instead of local stand-ins for player, enemy, floor, VFX, pickups, and weapon models.
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`
  - Catalog categories include `Weapon Model`.
  - Most weapon entries now map to runtime component sources and `previewKind: 'weaponModel'`.
  - `Extra Battery Upgrade Icon` remains `previewKind: 'image'` by design because no 3D runtime model exists.
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.test.js`
  - Includes guard that weapon entries point at shared in-game model previews where models exist.
- `Developer/r3f_prototype/src/components/GraphicsStudio.test.jsx`
  - Updated expectation from `Weapon Icon` to `Weapon Model`.

VFX / weapons:

- `Developer/r3f_prototype/src/components/VFXLayer.jsx`
  - Exports `HitSpark`, `ChargeWarningLine`, and `PickupPop`.
- Weapon files now export model/visual components for studio reuse:
  - `Weapons/Pencil.jsx` -> `PencilModel`
  - `Weapons/SchoolBag.jsx` -> `ThirtyCmRulerModel`
  - `Weapons/Tumbler.jsx` -> `TumblerModel`
  - `Weapons/Flask.jsx` -> `FlaskModel`
  - `Weapons/Bell.jsx` -> `BellModel`
  - `Weapons/StunGun.jsx` -> `LightningBoltModel`
  - `Weapons/Onigiri.jsx` -> `OnigiiriModel`
  - `Weapons/Starlink.jsx` -> `StrikeVisual`
  - `Weapons/CompassBlade.jsx` -> `CompassBladeModel`
  - `Weapons/UmbrellaGuard.jsx` -> `UmbrellaModel`
  - `Weapons/EraserBomb.jsx` -> `EraserModel`
  - `Weapons/BoxCutter.jsx` -> `BoxCutterModel`
  - `Weapons/Chibiko.jsx` -> `ChibikoModel`, `ChibikoPencilModel`
  - `Weapons/SharkMissile.jsx` -> `SharkMissileModel`, `FlameTrail`

## Verification output

Focused graphics/studio tests:

```text
npm test -- src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx src/components/PlayerMesh.test.js

Test Files  3 passed (3)
Tests       9 passed (9)
Duration    7.23s
```

Known test noise:

- `GraphicsStudio.test.jsx` prints React `act(...)` environment warnings. These warnings did not fail the tests and appear to be test-harness noise.

Build:

```text
npm run build

✓ 710 modules transformed.
✓ built in 717ms
```

Known build warning:

- Vite/Rolldown reports large chunks over 500 kB. This is existing bundle-size warning territory and not a failure of the graphics audit.

Browser check:

```text
URL: http://127.0.0.1:5191/graphics-studio
Result: Graphics Studio loaded; Player preview visible; catalog and inspector rendered.
Console: total_errors=0; only Vite connect and React DevTools info messages.
```

## Recommended next implementation cards

### Card A — Replace enemy charge HTML sprite cue with 3D/toon world cue

Assignee suggestion: `game-developer` or graphics implementation specialist.

Problem:

- `Enemy.jsx` uses `<Html ... sprite>` for the `go!` charge cue. It is not replacing the monster, but it is a 2D overlay attached to monster action.

Acceptance criteria:

- Replace `GoSpeechBubble` with an in-world 3D/toon warning cue, or remove it if `ChargeWarningLine` is enough.
- Preserve E05/B01 charge readability.
- No player/monster 2D sprite substitutes.
- Add or update a focused test if the cue state is testable.
- Run focused enemy/graphics tests and a browser visual check.

### Card B — Add Graphics Studio parity regression guard

Assignee suggestion: `game-developer` or reviewer.

Problem:

- The current code direction is good, but future changes could reintroduce studio-only stand-ins or icon previews for runtime 3D visuals.

Acceptance criteria:

- Add tests that every `GRAPHICS_STUDIO_CATALOG` item with `previewKind: 'weaponModel'`, `player`, `zombie`, `vfx`, `projectile`, or `floor` has a real shared runtime source path and does not point to a local studio-only approximation.
- Keep `weapon-extra-battery` as the only explicitly documented image exception unless a 3D model is added.
- Run `npm test -- src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx`.

### Card C — Stage 1 visual loop screenshot QA pass

Assignee suggestion: `balance_qa` / QA specialist.

Problem:

- The Graphics Studio path was browser-verified, but normal Stage 1 gameplay visual loop should be screenshot-verified after the dirty graphics batch is reviewed.

Acceptance criteria:

- Launch the game in browser and capture Stage 1 visual evidence covering player, E01, E05 charge warning, B01 if reachable/cheatable, at least three weapon effects, pickups, floor/stage objects, and no visible debug proxies.
- Record results in `Quaility_Assurance/` with screenshot paths.
- Call out any visual policy violations or readability regressions.

## Caution for follow-up implementers

- Do not run destructive git cleanup. The current working tree has many unrelated uncommitted changes.
- Do not commit unless Terry explicitly asks.
- Keep any follow-up code diffs narrow and preserve current toon/outline helpers.
- Do not replace characters or monsters with 2D sprites, image planes, or visible proxy shapes.
