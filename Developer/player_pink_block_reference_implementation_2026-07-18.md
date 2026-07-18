# PlayerMesh pink block reference implementation record

Date: 2026-07-18
Role: threemini / graphics implementation
Task: t_7f4596b5

## Scope

Remodeled the shared low-poly toon protagonist in `PlayerMesh` to better match the supplied pink-haired block student reference while preserving the single shared runtime/Graphics Studio model path.

## Code changes

- `Developer/r3f_prototype/src/components/PlayerMesh.jsx`
  - Tuned existing block dimensions and colors only.
  - Compact body: `PLAYER_BODY_SIZE` to `[0.68, 0.7, 0.46]`, `PLAYER_BODY_POSITION` to `[0, 0.44, 0]`.
  - Larger rectangular head: `PLAYER_HEAD_SIZE` to `[0.8, 0.68, 0.58]`, `PLAYER_HEAD_BASE_Y` to `1.1`.
  - Larger head outline hull: `[1.08, 1.04, 0.86]`.
  - Hair cap/front fringe changed to pastel pink `0xff8fb0`; side/back locks to darker pink `0xd94070`.
  - Eyes changed to magenta `0xcf2f77`.
  - Front straps changed to vivid blue `0x005cff`; skirt block changed to brighter blue `0x2d8cff`.
  - No direct child additions/removals/reordering and no source-controlled seed edits.
- `Developer/r3f_prototype/src/components/PlayerMesh.test.js`
  - Added palette/proportion regression coverage for the reference read.
  - Added registered part order guard for the player Studio path topology.
- `Developer/r3f_prototype/src/components/TitleScene3D.test.jsx`
  - Strengthened title-facing test to assert `TitlePlayer` imports/renders the shared `<PlayerMesh />` and does not use a proxy block mesh.
- `Graphic_designer/player_pink_block_reference_match_2026-07-18.md`
  - Visual implementation and approximation notes.

## Guards observed

- Preserved `StudioTunedGroup itemId="player"` in `PlayerMesh`.
- Did not edit `Developer/r3f_prototype/src/lib/graphicsStudioPlayerSource.js`.
- Did not introduce frozen/rest-capture reset workaround.
- Did not restore the permanently removed title rectangle/fixture lights.
- Did not commit, reset, delete, push, or attempt to clean unrelated uncommitted files.

## Verification commands and results

1. RED check:
   - Command: `npm test -- --run src/components/PlayerMesh.test.js src/components/TitleScene3D.test.jsx`
   - Result: failed as expected before production changes; `PlayerMesh layout > encodes the pink block survivor reference palette and compact proportions` expected `[0.68, 0.7, 0.46]` but received old `[0.75, 0.72, 0.5]`.
2. Focused green check:
   - Command: `npm test -- --run src/components/PlayerMesh.test.js src/components/TitleScene3D.test.jsx`
   - Result: 2 files passed, 33 tests passed.
3. Required focused integration set:
   - Command: `npm test -- --run src/components/PlayerMesh.test.js src/components/TitleScene3D.test.jsx src/components/GraphicsStudioPreview.test.js src/components/StudioTunedGroup.test.jsx src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx`
   - Result: 6 files passed, 141 tests passed. Existing React `act(...)` and duplicate Three.js warnings appeared.
4. Production build:
   - Command: `npm run build`
   - Result: build passed; postbuild legacy artifact gate passed. Existing large chunk warning remained.

## Remaining visual approximation limits

- The reference is represented using existing Three.js block primitives, so there are no curved/sculpted hair or fabric contours.
- A separate red tie/panel direct child was not added because preserving Studio numeric path topology was higher priority; the existing red jacket body remains the visible center red area behind the white collar block.
