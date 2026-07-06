# Stage 2 Teacher Zombie Boss Implementation

Date: 2026-07-06

## Change

- Added `B02` as the Stage 2 boss type.
- Copied `boss_02.webp` into the game assets.
- Added a `B02` three.js block model with hair, bun, suit, skirt, arms, legs, and shoes.
- Connected Stage 2 boss spawning and lobby preview to `B02`.
- Changed the default Stage 2 boss burst event to spawn `B02` directly.
- Registered `B02` in Graphics Studio enemy catalog.
- Fixed Graphics Studio stage boss preview so selecting `Zombie B02` previews and syncs `B02`, not the default `B01`.
- Added a stable Graphics Studio part ID for the `B02` face texture plane: `b02-face-texture`.
- Updated part focus lookup so stable-ID part edits apply to the runtime game model immediately, even when the studio preview and lobby/game preview use different wrapper groups.
- Fixed lobby boss preview updates by invalidating R3F demand-rendered canvases after StudioTunedGroup applies saved studio tuning.
- Rendered the `B02` face texture as a depth-test-free front decal so scaling the selected texture plane does not fight with nearby head and hair blocks.
- Changed `B02` face texture scale edits to adjust texture fit on the fixed face plane instead of resizing the whole image plane.
- Added stable Graphics Studio part IDs for the main `B02` boss groups so focusing selects logical parts instead of internal render meshes.
- Lowered the Stage Boss Preview base framing and narrowed saved Pan Y so the `B02` face stays inside the preview while panning.
- Changed Graphics Studio mesh part focusing to draw a local `EdgesGeometry` outline on the selected mesh instead of a large world-axis box, so the `B02` face texture focus stays thin and face-sized.
- Kept focus outline helper objects out of normal studio material tuning so Apply does not recolor or resize the neon focus guide.
- Made the `B02` head front and face texture plane share the same exact square layout, and moved hair blocks away from the front face so `boss_02.webp` owns the visible face area.
- Reframed the `B02` face toward the concept art by restoring front hair blocks as 3D cap/side pieces while keeping the face texture uncropped on the square face plane.
- Restored concept-style side and back hair coverage on `B02` with additional hair blocks around the side head and back of the skull.
- Removed the previous face texture repeat/offset crop because it enlarged the glasses, brows, and mouth in Graphics Studio.
- Rebuilt the Stage 2 teacher boss implementation from a fresh `Stage2TeacherBossMesh` / `Stage2TeacherFaceTexture` path and removed the previous `B02_BOSS_*`, `Boss02FaceTexture`, and `B02BossZombieMesh` implementation names.
- Moved the Graphics Studio item ID for `B02` from the legacy `zombie-b02` key to `zombie-b02-teacher`, so old browser-saved B02 tunings and decals no longer attach to the rebuilt boss.
- Deleted the broken custom `B02` teacher boss production model path entirely from `ZombieMesh.jsx`; `B02` now falls back to the shared generic zombie rig until a clean replacement model is built.
- Rebuilt `B02` as a clean low-poly teacher zombie model using the shared zombie animation rig, with the face texture attached to the head and separate controllable hair, side hair, back hair, bun, body, arm, and leg studio parts.
- Moved the current `B02` Graphics Studio item ID to `zombie-b02-teacher` so older `zombie-b02-rebuilt` saved transforms and decals cannot attach to the new model.
- Fixed the B02 Graphics Studio part focus root cause: toon render-outline meshes are now marked as non-focus render helpers and skipped by focus outline generation, so neon focus lines are not doubled.
- Removed the old B02 texture-fit runtime path and stale face-texture part tests; the face texture is display-only and no longer has a separate studio transform path.
- Split B02 hair and body control IDs down to visible block units, including front hair cap, left/right front locks, side hair, back hair, bun base, bun top, suit, shirt, skirt, hands, legs, and shoes. Parent animation rigs no longer carry broad studio part IDs.
- Moved the B02 front hair cap slightly forward from the head front so the visible hair block receives the double-click raycast instead of the underlying head block.
- Disabled raycasting on Graphics Studio neon focus outline helpers so a selected B02 part's outline cannot intercept the next double-click and block selecting another part.
- Remodeled B02 hair into exactly five controllable rectangular blocks: `b02-hair-top-plate`, `b02-hair-left-plate`, `b02-hair-right-plate`, `b02-hair-back-plate`, and `b02-bun-block`.
