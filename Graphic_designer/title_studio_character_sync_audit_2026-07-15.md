# Title vs Graphics Studio character synchronization audit

Date: 2026-07-15
Role: threemini / Three.js R3F cartoon graphics audit
Scope: read-only source audit, except this artifact.
Task: `t_2852142d` — trace why the title screen player can look different from the latest Graphics Studio player model and audit every title character's Studio synchronization path.

## 0. Guardrails observed

- Project policies and graphics references were read before writing this artifact:
  - `project_develop_policy.md`
  - `Bang_Rules.md`
  - `AGENTS.md`
  - `SESSION_CONTINUITY.md`
  - `Developer/agent_room/game_development_kanban_process.md`
  - `Developer/agent_room/ide_agent_subagent_autocall_handoff.md`
  - `Developer/agent_room/subagent_system_wiring_2026-07-03.md`
  - `Graphic_designer/Bang_survivor_Graphic_concept.md`
- Git tree already had unrelated uncommitted source/asset changes before this audit. I did not modify source code, delete, reset, commit, or push.
- Output artifact only: `Graphic_designer/title_studio_character_sync_audit_2026-07-15.md`.

## 1. Short conclusion

The player's underlying mesh/model is shared between gameplay, Graphics Studio player preview, and the runtime title scene through `PlayerMesh` and `StudioTunedGroup itemId="player"`. Therefore saved Graphics Studio tuning for the `player` item should propagate to the runtime title player's mesh.

The visible mismatch comes from the layer above that shared mesh:

1. Graphics Studio's player preview renders `PlayerVisual`, including preview arm action and health bar, inside Studio's selected-item transform root.
2. The runtime title scene renders a custom `TitlePlayer` wrapper with hard-coded title-only position, rotation, scale, and bobbing animation, and it calls `<PlayerMesh />` directly, not `PlayerVisual`.
3. The Graphics Studio `title-scene` preview intentionally passes `studioTuning` into `TitleScene3D`; that puts Studio in preview mode, and `StudioTunedGroup` suppresses all nested item tuning in preview mode. So when editing/looking at the `title-scene` catalog item, nested `player`, `zombie-*`, `enemy-matilda`, etc. saved tunings are not applied in that preview. The runtime title scene does not pass `studioTuning`, so nested `StudioTunedGroup` wrappers do load saved tunings.
4. One title actor has a real sync gap: Doge is registered in the Graphics Studio catalog as `actor-doge`, but `DogeMesh.jsx` / `DancingDoge` does not wrap the runtime Doge mesh in `StudioTunedGroup itemId="actor-doge"`. Thus Graphics Studio changes saved for `actor-doge` cannot reach title Doge or in-game Doge through the normal runtime tuning path.

So the precise causal chain is: shared player model exists, but title uses a title-specific presentation wrapper and title-scene preview suppresses nested saved tunings; additionally, Doge is cataloged but not wired to runtime `StudioTunedGroup`.

## 2. Evidence: Studio tuning storage and runtime application

### 2.1 Storage key and save/load path

- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js:21` defines `GRAPHICS_STUDIO_STORAGE_KEY = 'escape-zombie-school.graphicsStudioTunings.v1'`.
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js:571-578` loads saved tunings from that storage key.
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js:588-597` normalizes and saves tunings, then dispatches `GRAPHICS_STUDIO_TUNING_EVENT`.
- `Developer/r3f_prototype/src/App.jsx:28-36` handles `STUDIO_GAME_SYNC_MESSAGE`; if `event.data.tunings` exists, it calls `saveStudioTunings(event.data.tunings)`.
- `Developer/r3f_prototype/src/lib/studioGameBridge.js:1` names the cross-window sync message: `escape-zombie-school.studioGameSync.v1`.

### 2.2 Runtime application component

- `Developer/r3f_prototype/src/components/StudioTunedGroup.jsx:179-185` loads item state by `itemId`: `tunings[itemId] ?? DEFAULT_STUDIO_TUNING`, plus decals.
- `StudioTunedGroup.jsx:188-204` subscribes to tuning/decal/storage change events unless it is in preview-only mode.
- `StudioTunedGroup.jsx:209-215` applies transform/material/part tuning/decal data to `groupRef.current` unless preview-only mode is active.
- `StudioTunedGroup.jsx:223-224` is the key preview/runtime split: if `previewOnly`, it returns children directly; otherwise it returns a transformed `<group>`.

Implication: a runtime title/game actor must contain a `StudioTunedGroup` with the same catalog item id. If it does not, the saved Graphics Studio item cannot affect that actor at runtime.

## 3. Player causal chain

### 3.1 Graphics Studio player preview path

- `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx:475-477` renders the player catalog item with:
  - `PlayerVisual`
  - `meshGroup={playerRef}`
  - `movingRef={movingRef}`
  - `hp={100}` / `maxHp={100}`
  - `previewArmAction={PLAYER_STUDIO_ARM_ACTIONS[item.animation] ?? null}`
- `GraphicsStudioPreview.jsx:604-611` derives the selected item animation from `tuning.animation` for `player`, `zombie`, and `matilda`, then calls `useApplyStudioTuning(rootRef, selectedItem.id, tuning, ...)`.
- `GraphicsStudioPreview.jsx:651-652` places the preview item under the selected-item Studio transform root.
- `Player.jsx:31-35` defines `PlayerVisual` as `PlayerMesh` plus `MiniHealthBar` when `showHealthBar` is true.

Therefore the Graphics Studio player preview is not a bare `PlayerMesh`; it is `PlayerVisual` with preview-only state/health-bar behavior and Studio's selected-item root transform.

### 3.2 Gameplay player path

- `Developer/r3f_prototype/src/components/Player.jsx:31-35` `PlayerVisual` renders `PlayerMesh` and optional `MiniHealthBar`.
- `Player.jsx:40-158` gameplay `Player` drives movement, facing, hit flash, knockback, and passes live refs/state into that visual path.
- `Developer/r3f_prototype/src/components/PlayerMesh.jsx:242-245` wraps the actual player model with `<StudioTunedGroup itemId="player">`.

Therefore gameplay and title share the same underlying player mesh tuning id, `player`, once execution reaches `PlayerMesh`.

### 3.3 Runtime title player path

- `Developer/r3f_prototype/src/components/TitleScene3D.jsx:93-110` defines `TitlePlayer`.
- `TitleScene3D.jsx:95-104` applies a title-only bobbing/rotation animation to a wrapper ref.
- `TitleScene3D.jsx:107-108` applies hard-coded wrapper transform `position={[0.48, 0.88, 0.38]}`, `rotation={[-0.08, 0.48, 0.05]}`, `scale={2}`, then renders `<PlayerMesh />` directly.
- `TitleScene3D.jsx:473` places `<TitlePlayer />` into the title scene.
- Because `PlayerMesh.jsx:242-245` still wraps its contents with `StudioTunedGroup itemId="player"`, saved `player` model tuning is applied inside the title wrapper at runtime.

Therefore the title player's base model sync exists, but its final visible pose/size/placement is intentionally different because `TitlePlayer` adds a title-only transform and animation above the shared mesh.

### 3.4 Title-screen mounting path

- `Developer/r3f_prototype/src/components/TitleScreen.jsx:273-281` renders a Canvas and mounts `<TitleScene3D reducedEffects={false} />`.
- In that runtime path, `studioTuning` is not passed.
- `TitleScene3D.jsx:426-427` detects Studio mode by `studioTuning != null`.
- `TitleScene3D.jsx:487` wraps the scene in `<StudioTunedGroup itemId="title-scene">` only when not in Studio mode.

Therefore runtime title scene uses both the title-scene tuning wrapper and nested runtime actor wrappers such as `player` and `zombie-*`.

### 3.5 Graphics Studio title-scene preview path

- `GraphicsStudioPreview.jsx:626-630` renders the `titleScene` preview with `<TitleScene3D studioGroupRef={rootRef} studioTuning={tuning} />`.
- `GraphicsStudioPreview.jsx:669` wraps the Canvas contents in `StudioTuningPreviewProvider`.
- `StudioTunedGroup.jsx:188-189` reads that preview context.
- `StudioTunedGroup.jsx:223` returns only children when `previewOnly` is true, so nested actor item tuning is suppressed in Graphics Studio preview.
- `TitleScene3D.jsx:426-434` applies only the passed `studioTuning` to the title scene root in Studio mode.
- `TitleScene3D.jsx:487` skips the outer `title-scene` `StudioTunedGroup` in Studio mode because `studioMode ? sceneRoot : <StudioTunedGroup itemId="title-scene">...`.

Therefore the Graphics Studio `title-scene` preview is not an exact preview of the runtime title scene after all nested character item tunings. It previews the title-scene root tuning and raw shared child models with nested `StudioTunedGroup` disabled by preview mode.

## 4. Exhaustive title character / character-like synchronization table

This table covers every character or character-like visual instantiated by `TitleScene3D.jsx:461-473`, plus the far-background story characters from `TitleScene3D.jsx:149-153` and the companion character-like weapon mascot from `TitleScene3D.jsx:118-123`.

| Title visual | Title placement evidence | Runtime component path | Studio id used at runtime | Studio catalog evidence | Sync status | Notes |
|---|---:|---|---|---|---|---|
| Player | `TitleScene3D.jsx:473`; wrapper at `93-110` | `TitlePlayer` -> `PlayerMesh` | `player` | `PlayerMesh.jsx:242-245` | Synced for model tuning; title-specific presentation differs | Direct `<PlayerMesh />`, not `PlayerVisual`; title wrapper has hard-coded `scale={2}`, position/rotation, bobbing. |
| Boss Zombie B02 teacher | `TitleScene3D.jsx:461` | `TitleBossZombie` -> `ZombieMesh type="B02"` | `zombie-b02-teacher` | `graphicsStudioConfig.js:31-38`; `ZombieMesh.jsx:536-540` | Synced | `getStudioZombieItemId('B02')` maps B02 to the separate rebuilt teacher id. |
| Boss Zombie B03 PE teacher | `TitleScene3D.jsx:462` | `TitleBossZombie` -> `ZombieMesh type="B03"` | `zombie-b03-pe-teacher` | `graphicsStudioConfig.js:31-38`; `ZombieMesh.jsx:528-532` | Synced | Separate B03 studio id is used. |
| Boss Zombie B01 | `TitleScene3D.jsx:463` | `TitleBossZombie` -> `ZombieMesh type="B01"` | `zombie-b01` | `ZombieMesh.jsx:520-524` | Synced | Uses explicit B01 id. |
| Zombie E03 left/back | `TitleScene3D.jsx:464` | `TitleZombie` -> `ZombieMesh type="E03"` | `zombie-e03` | `graphicsStudioConfig.js:36-38`; `ZombieMesh.jsx:544-545` | Synced | Generic zombies use `getStudioZombieItemId(type)`. |
| Zombie E02 right/back | `TitleScene3D.jsx:465` | `TitleZombie` -> `ZombieMesh type="E02"` | `zombie-e02` | `graphicsStudioConfig.js:36-38`; `ZombieMesh.jsx:544-545` | Synced | Same generic mapping. |
| Zombie E01 front/left | `TitleScene3D.jsx:466` | `TitleZombie` -> `ZombieMesh type="E01"` | `zombie-e01` | `graphicsStudioConfig.js:36-38`; `ZombieMesh.jsx:544-545` | Synced | Same generic mapping. |
| Zombie E02 mid/right | `TitleScene3D.jsx:467` | `TitleZombie` -> `ZombieMesh type="E02"` | `zombie-e02` | `graphicsStudioConfig.js:36-38`; `ZombieMesh.jsx:544-545` | Synced | Same studio item as the other E02 title instance. |
| Zombie E03 mid/back | `TitleScene3D.jsx:468` | `TitleZombie` -> `ZombieMesh type="E03"` | `zombie-e03` | `graphicsStudioConfig.js:36-38`; `ZombieMesh.jsx:544-545` | Synced | Same studio item as the other E03 title instance. |
| Matilda | `TitleScene3D.jsx:469`; wrapper at `179-194` | `TitleMatildaPursuer` -> `MatildaMesh` | `enemy-matilda` | `graphicsStudioConfig.js:145-151`; `MatildaMesh.jsx:204-206` | Synced | Wrapper adds title pursuit bob/rotation/scale above synced mesh. |
| Doge left | `TitleScene3D.jsx:470` | `DancingDoge` -> `DogeMesh` | None in component | catalog exists at `graphicsStudioConfig.js:137-143`, but `DogeMesh.jsx:101-119` and `192-195` contain no `StudioTunedGroup` | Not synced | Real gap. `actor-doge` is registered but not wired into runtime Doge mesh. |
| Doge right | `TitleScene3D.jsx:471` | `DancingDoge` -> `DogeMesh` | None in component | same as above | Not synced | Same gap for both title Doge instances and likely in-game Doge. |
| Compass duck-potty companion/weapon model | `TitleScene3D.jsx:118-120` | `CompassBladeModel` | `weapon-compass` | `CompassBlade.jsx:81-92` | Synced as weapon model | Not a character, but title companion-like model. It has runtime Studio wrapper. |
| Chibiko companion | `TitleScene3D.jsx:121-123` | `ChibikoModel` | `weapon-chibiko` | `Chibiko.jsx:74-107` | Synced as weapon/mascot model | Character-like companion but cataloged as weapon model. |
| Far crashed Starlink satellite | `TitleScene3D.jsx:149-151` | `StarlinkSatelliteModel studioItemId="title-crashed-starlink"` | `title-crashed-starlink` | `StarlinkSatellite.jsx:149-152` supports custom id | Partially/unknown | Not a character. Runtime wrapper exists, but this specific id is not visibly represented in the catalog lines audited; normal satellite catalog id is the default `weapon-starlink-satellite`. |
| Far Zomlonbisk | `TitleScene3D.jsx:152-153` | `ZomlonbiskModel running={false}` | `actor-zomlonbisk` | `StarlinkSatellite.jsx:191-223` | Synced if catalog entry exists for `actor-zomlonbisk` | Runtime wrapper exists. This audit confirms runtime id, not catalog coverage. |

## 5. Missing-test analysis

Existing regression coverage has pieces of the contract, but not the full title-vs-Studio synchronization guarantee.

Observed existing coverage:

- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.test.js:67-75` verifies `actor-doge` is registered in the catalog.
- `graphicsStudioConfig.test.js:88-106` verifies B02/B03 special studio ids.
- `graphicsStudioConfig.test.js:125-160` begins a runtime-parity preview test family for shared sources/components.
- `Developer/r3f_prototype/src/components/TitleScene3D.test.jsx:152-166` checks some title placement strings, including Zomlonbisk and Doge positions.

Missing guards:

1. No test asserts that every title character component path contains a runtime `StudioTunedGroup` whose id matches the catalog id.
2. No test catches the Doge gap: catalog `actor-doge` exists, but `DogeMesh.jsx`/`DancingDoge` does not use `StudioTunedGroup itemId="actor-doge"`.
3. No test documents the intended difference between `TitlePlayer` and `PlayerVisual`, so a reviewer can confuse title presentation drift with player mesh drift.
4. No test states that `title-scene` Graphics Studio preview suppresses nested item tuning by design. Without a test or doc, users can reasonably expect the title-scene preview to show the same nested character tunings as runtime title.
5. No test asserts that all title scene character instances in `TitleScene3D.jsx:461-473` have a Studio synchronization path.

## 6. Minimal prevention contract

Recommended minimal contract before future title/Studio character changes:

1. Every reusable title character or character-like runtime model must own exactly one canonical Studio item id in its model component, not only in the catalog.
   - Example required pattern: model component contains `StudioTunedGroup itemId="<catalog-id>"`.
2. Title-only scene placement wrappers may add position/rotation/scale/animation, but they must not replace the shared model component with a separate fork.
3. The title player contract should explicitly state:
   - model tuning source: `PlayerMesh` / `player`
   - title presentation source: `TitlePlayer` wrapper
   - Graphics Studio player preview source: `PlayerVisual`
4. The `title-scene` catalog item should be documented/tested as a root scene composition tuner, not a fully nested saved-character-tuning preview, unless implementation is changed to layer nested saved tunings into that preview.
5. Add a static regression test that scans/declares the title character sync matrix:
   - Player -> `player`
   - B02 -> `zombie-b02-teacher`
   - B03 -> `zombie-b03-pe-teacher`
   - B01 -> `zombie-b01`
   - E01/E02/E03 -> `zombie-e01/e02/e03`
   - Matilda -> `enemy-matilda`
   - Doge -> `actor-doge`
   - Chibiko -> `weapon-chibiko`
   - Zomlonbisk -> `actor-zomlonbisk`
6. Add a focused Doge regression test: `actor-doge` catalog entry must be paired with a runtime `StudioTunedGroup itemId="actor-doge"` in `DogeMesh.jsx` or an equivalent runtime path.

## 7. Final answer to the reported player mismatch

The title screen player does not use a separate player mesh fork. It uses `PlayerMesh`, and `PlayerMesh` is tuned by `StudioTunedGroup itemId="player"`.

What differs is the presentation layer: title wraps the mesh in `TitlePlayer` with title-only scale/position/rotation/bobbing, while Graphics Studio's player preview wraps `PlayerVisual` in the Studio preview root and includes preview arm action/health-bar behavior. Also, if the comparison is made inside the Graphics Studio `title-scene` preview, nested saved player tuning is suppressed by `StudioTuningPreviewProvider` / `StudioTunedGroup previewOnly`, so that preview can diverge from runtime title.

The definite synchronization defect found during the audit is Doge: `actor-doge` is cataloged, but neither `DogeMesh` nor `DancingDoge` applies `StudioTunedGroup itemId="actor-doge"`, so title Doges cannot receive the latest Graphics Studio Doge tuning at runtime.
