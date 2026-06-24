# Auto-deploy graphics audit — Stage 1 visual loop

Date: 2026-06-24 23:42 local
Role: Three_Mini / 3D cartoon graphics implementation audit
Task: `t_79cf323b`

## 0. Scope and policy gates

This audit inspected the current 3D toon rendering, player, enemy, weapon, VFX, Graphics Studio parity, and recent uncommitted graphics changes for the Stage 1 visual loop.

Mandatory visual rules checked:

- Player and monsters must remain 3D, not 2D sprite substitutes.
- Player and monsters must use `MeshToonMaterial` or equivalent toon shader.
- Player and monsters must have outline treatment.
- Normal gameplay must not expose visible debug proxy shapes.
- Player 3D model position must stay aligned with the real player coordinate.

Startup/project files read:

- `AGENTS.md`
- `project_develop_policy.md`
- `Bang_Rules.md`
- `SESSION_CONTINUITY.md`
- `CLAUDE.md`
- `SESSION_MEMORY.md` latest visible entry
- `Graphic_designer/Bang_survivor_Graphic_concept.md`

Role-relevant implementation/art review files inspected:

- `Developer/r3f_prototype/src/lib/toon.js`
- `Developer/r3f_prototype/src/components/Player.jsx`
- `Developer/r3f_prototype/src/components/PlayerMesh.jsx`
- `Developer/r3f_prototype/src/components/ZombieMesh.jsx`
- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/components/EnemyProjectileVisual.jsx`
- `Developer/r3f_prototype/src/components/Floor.jsx`
- `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`
- `Developer/r3f_prototype/src/components/VFXLayer.jsx`
- `Developer/graphics_studio_shared_visuals_implementation_2026-06-23.md`
- `Graphic_designer/graphics_studio_ingame_visual_parity_2026-06-23.md`

## 1. Current git / risk state

Observed command output:

```text
git status --short --branch
## feature/stage2-corridor-floor-graphics...origin/feature/stage2-corridor-floor-graphics [ahead 6]
 M Developer/r3f_prototype/src/components/Floor.jsx
 M Developer/r3f_prototype/src/components/GraphicsStudio.test.jsx
 M Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx
 M Developer/r3f_prototype/src/components/Player.jsx
 M Developer/r3f_prototype/src/components/PlayerMesh.jsx
 M Developer/r3f_prototype/src/components/VFXLayer.jsx
 M Developer/r3f_prototype/src/components/Weapons/Bell.jsx
 M Developer/r3f_prototype/src/components/Weapons/BoxCutter.jsx
 M Developer/r3f_prototype/src/components/Weapons/Chibiko.jsx
 M Developer/r3f_prototype/src/components/Weapons/CompassBlade.jsx
 M Developer/r3f_prototype/src/components/Weapons/EraserBomb.jsx
 M Developer/r3f_prototype/src/components/Weapons/Flask.jsx
 M Developer/r3f_prototype/src/components/Weapons/Missile.jsx
 M Developer/r3f_prototype/src/components/Weapons/Onigiri.jsx
 M Developer/r3f_prototype/src/components/Weapons/Pencil.jsx
 M Developer/r3f_prototype/src/components/Weapons/SchoolBag.jsx
 M Developer/r3f_prototype/src/components/Weapons/SharkMissile.jsx
 M Developer/r3f_prototype/src/components/Weapons/Starlink.jsx
 M Developer/r3f_prototype/src/components/Weapons/StunGun.jsx
 M Developer/r3f_prototype/src/components/Weapons/Tumbler.jsx
 M Developer/r3f_prototype/src/components/Weapons/UmbrellaGuard.jsx
 M Developer/r3f_prototype/src/lib/graphicsStudioConfig.js
 M Developer/r3f_prototype/src/lib/graphicsStudioConfig.test.js
?? Developer/r3f_prototype/src/components/EnemyProjectileVisual.jsx
?? Developer/r3f_prototype/src/components/PlayerMesh.test.js
...plus role records and QA screenshots from other recent work
```

Audit risk note: the tree is intentionally dirty and ahead of origin. This audit did not modify runtime code and did not commit. Only this audit artifact and the matching Developer handoff were added.

## 2. Toon rendering compliance

Status: PASS with one follow-up watch item.

Evidence:

- `lib/toon.js` defines `toonMat()` with `new THREE.MeshToonMaterial`, a nearest-filtered gradient map, and stencil writes.
- `outlineMat()` uses an inverted-hull style BackSide material with stencil `NotEqual` test to reduce internal seams.
- `OUTLINE_THICKNESS_MULT` and `inflateScale()` centralize outline inflation.
- `PlayerMesh.jsx` imports and uses `toonMat`, `outlineMat`, and `inflateScale` for block-model body parts and outer outline meshes.
- `ZombieMesh.jsx` imports and uses the same toon/outline helpers for all zombie types.
- `EnemyProjectileVisual.jsx` uses toon/outline helpers for the E04 projectile visual.

Follow-up watch item:

- `PlayerMesh.jsx` currently renders one flat circular shadow using `meshBasicMaterial` and `circleGeometry`. This is acceptable as a shadow, not a character substitute/debug marker. It should remain dark/subtle and must not become a visible player proxy ring.

## 3. Player 3D model / coordinate alignment

Status: PASS.

Evidence:

- `Player.jsx` keeps the gameplay `RigidBody` at `[0, 0.32, 0]` and renders `<PlayerVisual>` inside that rigid body.
- `PlayerVisual` renders `<PlayerMesh groupRef={meshGroup} movingRef={movingRef} />` and the health bar in the same rigid body hierarchy, so the model follows real physics translation.
- `playerPos` is updated from the clamped rigid body translation each frame, preserving gameplay and visual coordinate sync.
- The recent `PlayerMesh.jsx` changes expose `PLAYER_MESH_LAYOUT` and keep head/hair/eye positions tied to `PLAYER_MESH_LAYOUT.head.baseY + bob`, preventing detached head/hair bobbing.
- `PlayerMesh.test.js` exists and the focused test run passed.

Visual note:

- Browser verification on `/graphics-studio` displayed the Player preview as a small 3D toon block character with health bar, catalog, and inspector intact. Browser console had no JS errors.

## 4. Enemy / monster visual compliance

Status: PASS with one P1 polish recommendation.

Evidence:

- `Enemy.jsx` renders `EnemyVisual`, which renders `ZombieMesh` for all `E01`–`E06`/`B01` types.
- `ZombieMesh.jsx` is fully 3D box-geometry toon/outline composition, not sprite or 2D sheet animation.
- Enemy movement/charge/stun phases are expressed with 3D body/limb animation states.
- `B01` remains chase/charge based and does not use Stage 1 projectile fan shots, consistent with `Bang_Rules.md` Stage 1 projectile removal addendum.

P1 polish recommendation:

- `Enemy.jsx` uses an HTML sprite speech bubble (`GoSpeechBubble`) for `go!` during charge warning. It is not replacing the monster body, but it is a 2D overlay attached to monster action. For stricter 3D visual consistency, replace or supplement it with an in-world toon sign/3D exclamation marker or rely on the existing `ChargeWarningLine` floor VFX.

## 5. Weapon / VFX / pickup integration

Status: mostly PASS.

Evidence:

- The recent diff exports weapon model components (`PencilModel`, `ThirtyCmRulerModel`, `TumblerModel`, `FlaskModel`, `BellModel`, `LightningBoltModel`, `OnigiiriModel`, `StrikeVisual`, `CompassBladeModel`, `UmbrellaModel`, `EraserModel`, `BoxCutterModel`, `ChibikoModel`, `SharkMissileModel`, `FlameTrail`) so Graphics Studio can inspect the same in-game models instead of icon substitutes.
- `VFXLayer.jsx` now exports `HitSpark`, `ChargeWarningLine`, and `PickupPop`, allowing the studio to reuse real VFX renderers.
- `EnemyProjectileVisual.jsx` provides a shared toon projectile visual used by runtime and studio.
- `graphicsStudioConfig.js` lists weapon entries as `Weapon Model` where 3D runtime model components exist.

Intentional exception:

- `Extra Battery Upgrade Icon` remains an image preview because the runtime currently has no 3D in-world model for that upgrade. This is acceptable only as an upgrade icon/catalog exception; if it becomes an in-world weapon/effect, it needs a 3D toon model.

P1 follow-up:

- Add explicit coverage that each non-image `weapon` catalog entry renders a non-null in-game model component and that no studio-only weapon stand-in is reintroduced.

## 6. Graphics Studio parity

Status: PASS.

Evidence:

- `GraphicsStudioPreview.jsx` now imports shared runtime components from `Player.jsx`, `Enemy.jsx`, `Floor.jsx`, `VFXLayer.jsx`, weapon runtime files, and `EnemyProjectileVisual.jsx`.
- `Floor.jsx` exposes `FloorVisual` so studio floor preview can use actual floor + stage object visual layer while excluding colliders.
- `graphicsStudioConfig.js` category changed from `Weapon Icon` to `Weapon Model` and includes `applyTargets` for code paths.
- Prior role records (`Developer/graphics_studio_shared_visuals_implementation_2026-06-23.md`, `Graphic_designer/graphics_studio_ingame_visual_parity_2026-06-23.md`) confirm the intended parity direction.

Browser verification:

- URL: `http://127.0.0.1:5191/graphics-studio`
- Result: Graphics Studio loaded; Player selected; Player 3D preview visible; left catalog and right inspector rendered; console had no JS errors.

## 7. Debug proxy / 2D substitute risk

Status: PASS for current inspected gameplay paths.

Evidence:

- `Floor.jsx` physics meshes are `visible={false}`.
- Search for `debug`, `proxy`, `placeholder`, `sprite`, visible debug flags did not find visible proxy geometry in player/enemy normal gameplay paths.
- Character/monster bodies are 3D toon components. No player/monster sprite replacement was found.

Allowed non-character 2D/flat elements found:

- Floor texture planes, shadows, health bars, UI overlays, VFX planes/rings, and icon assets. These are not player/monster substitutes.

Watch item:

- The `GoSpeechBubble` HTML sprite is a charge cue. It should be treated as temporary UI/VFX and not as monster animation replacement.

## 8. Verification performed

Commands/tests run:

```text
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
# GSTACK_OK

git status --short --branch && git diff --stat
# dirty tree, branch ahead 6, graphics files modified/untracked

npm test -- src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx src/components/PlayerMesh.test.js
# Test Files 3 passed (3)
# Tests 9 passed (9)
# Note: React act() warnings from existing test environment appeared, but tests passed.

npm run build
# vite build succeeded in 717ms
# Existing Vite chunk-size warning for >500kB bundle remains.

Browser: http://127.0.0.1:5191/graphics-studio
# Player preview visible, catalog/inspector intact, browser console total_errors=0.
```

## 9. Audit conclusion

Stage 1 visual loop is currently on the correct 3D toon-rendering path. The most important recent graphics changes move Graphics Studio away from separate stand-ins and toward shared in-game visual components, which reduces visual drift and supports safer art iteration.

Highest-priority next work:

1. Replace or formalize the enemy charge `go!` HTML sprite cue as in-world 3D/toon VFX so monster action feedback stays fully within the 3D cartoon language.
2. Add stronger automated parity guards for Graphics Studio catalog entries, especially weapon models and VFX, so future changes cannot silently reintroduce icons/stand-ins where real runtime models exist.
3. Run a dedicated Stage 1 browser visual loop capture after the current dirty graphics batch is reviewed, with screenshots for player, E01/E05/B01, weapons, pickups, VFX, and no visible proxy markers.

## 10. Blockers / handoff notes

Blockers:

- No blocking issue found after gstack became available.
- The only process risk is the large dirty working tree with many other-agent/user changes. Future implementation cards must avoid broad rewrites and should use narrow diffs.

Files changed by this audit:

- `Graphic_designer/auto_deploy_graphics_audit_2026-06-24.md`
- `Developer/auto_deploy_graphics_implementation_handoff_2026-06-24.md`

Do not commit from this audit unless Terry explicitly asks.
