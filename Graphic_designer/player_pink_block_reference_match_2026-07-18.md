# Player pink block reference match visual notes

Date: 2026-07-18
Role: threemini / Three.js R3F cartoon graphics implementation
Task: t_7f4596b5 — Match title protagonist to pink-haired block reference

## Visual target

The shared protagonist model should read as a compact low-poly block-character student, close to the supplied pink-haired block reference within code-native Three.js box geometry limits.

## Implemented visual choices

- Kept the runtime/title/Graphics Studio shared `PlayerMesh` path and `StudioTunedGroup itemId="player"`; no title-only mesh fork was introduced.
- Enlarged the rectangular head proportions and slightly compacted the torso so the silhouette reads more like a block-character reference.
- Shifted the hair palette to a pastel pink cap/front fringe with darker pink side and back locks.
- Kept the small white rectangular hair highlight/clip near the top-front.
- Kept the peach face and simplified magenta rectangular eyes with no realistic facial detail.
- Kept the red jacket, white upper shirt/collar block, red center body area, thin yellow waist trim, and bright blue skirt/waist block.
- Made the two front backpack straps a vivid blue so they remain readable from title framing.
- Kept slim light-gray legs, two-tone gray chunky shoes, peach hands, toon materials, render-only black outlines, and the black elliptical floor shadow.

## Studio and title preservation notes

- The existing `PlayerMesh` direct child order and registered part order were preserved; only dimensions, positions, and colors of existing blocks were tuned.
- `graphicsStudioPlayerSource.js` was not edited.
- The title still renders the shared `<PlayerMesh />` through `TitlePlayer`, with a regression test confirming it does not substitute a title-only block/proxy mesh.
- No removed title rectangle/fixture light components were restored.

## Approximation limits

- The model remains code-native box geometry rather than a bespoke sculpted mesh, so hair locks and clothing details are represented as rectangular blocks.
- The red center panel/tie area is represented by the visible red jacket body around/under the white collar block rather than adding a new separate direct child that could disturb Studio numeric paths.
- The reference image's exact flat orthographic icon proportions are approximated within the current gameplay-safe rig, animation, and source-controlled Studio path topology.

## Verification

- `npm test -- --run src/components/PlayerMesh.test.js src/components/TitleScene3D.test.jsx` — 2 files / 33 tests passed after the RED failure.
- `npm test -- --run src/components/PlayerMesh.test.js src/components/TitleScene3D.test.jsx src/components/GraphicsStudioPreview.test.js src/components/StudioTunedGroup.test.jsx src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx` — 6 files / 141 tests passed. Existing React `act(...)` and duplicate Three.js warnings remained.
- `npm run build` — production build passed; existing large chunk warning remained; legacy artifact gate passed.
- Desktop title render review: `Graphic_designer/QA_Reviews/title_player_reference_2026-07-18.png` confirms the shared player reads with the large pink block hair silhouette, simplified magenta eyes, red-and-blue uniform, light legs, two-tone shoes, black outline, and elliptical shadow in the actual title composition.
