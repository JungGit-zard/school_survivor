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
- Reframed the `B02` face toward the concept art by cropping the face texture to the eyes/mouth area and restoring front hair blocks as 3D cap/side pieces.
- Restored concept-style side and back hair coverage on `B02` with additional hair blocks around the side head and back of the skull.
