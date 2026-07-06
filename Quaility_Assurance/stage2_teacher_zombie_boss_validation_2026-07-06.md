# Stage 2 Teacher Zombie Boss Validation

Date: 2026-07-06

## Checks

- Confirm `B02` exists as a boss enemy stat entry.
- Confirm Stage 2 config uses `B02`.
- Confirm the default Stage 2 192-second boss burst event uses `B02`.
- Confirm the lobby unlocked Stage 2 preview receives `B02`.
- Confirm the B02 face uses `boss_02.webp` instead of modeled face/glasses parts.
- `npm test -- src/components/ZombieMesh.test.js src/components/Enemies.test.jsx src/lib/stageConfig.test.js src/components/Lobby.test.jsx src/components/StageBossPreview.test.js src/lib/graphicsStudioConfig.test.js`
  - Passed: 7 files, 57 tests.
- `npm run build`
  - Passed.
- `npm test -- src/components/Enemies.test.jsx src/components/ZombieMesh.test.js src/lib/stageConfig.test.js src/components/Lobby.test.jsx`
  - Passed: 4 files, 42 tests.
- `npm run build`
  - Passed after direct Stage 2 `B02` burst event wiring.
- `npm test -- src/components/GraphicsStudio.test.jsx src/components/StageBossPreview.test.js src/components/ZombieMesh.test.js src/components/Enemies.test.jsx src/components/Lobby.test.jsx`
  - Passed: 6 files, 54 tests.
- `npm run build`
  - Passed after Graphics Studio `B02` preview/sync fix.
- Playwright graphics studio smoke check
  - Confirmed `Zombie B02` catalog item exists.
  - Confirmed nonzero preview canvases render.
  - Screenshot: `Quaility_Assurance/stage2_teacher_zombie_boss_graphics_studio.png`.
- Confirm B02 face texture part edits use stable ID `id:b02-face-texture` so the same face plane is found in both Graphics Studio and runtime previews.
- Confirm stable-ID part tuning applies to the runtime mesh position, scale, and rotation instead of being lost when wrapper groups differ.
- `npm test -- src/components/StudioTunedGroup.test.jsx src/components/StageBossPreview.test.jsx src/components/StageBossPreview.test.js src/components/Lobby.test.jsx src/components/GraphicsStudio.test.jsx src/components/ZombieMesh.test.js`
  - Passed: 6 files, 40 tests.
- `npm run build`
  - Passed after adding R3F invalidate for demand-rendered lobby boss previews.
- Confirm B02 face texture material disables depth testing so texture scale edits stay visually stable over the head front.
- Confirm B02 face texture scale edits keep the face plane at base size and adjust the texture repeat/offset instead.
- Confirm B02 main boss groups expose stable part IDs so part focus does not select internal outline/body meshes.
- Confirm Stage Boss Preview Pan Y `0.5` keeps the `B02` face visible in the preview frame.
- Confirm B02 face texture focus uses a local mesh edge outline instead of an oversized world-axis focus box.
- Confirm repeated saved part Apply calls do not accumulate position and push the part downward.
- `npm test -- src/components/GraphicsStudioPreview.test.js src/components/StudioTunedGroup.test.jsx src/components/ZombieMesh.test.js src/components/GraphicsStudio.test.jsx src/components/Lobby.test.jsx src/lib/graphicsStudioConfig.test.js src/components/StageBossPreview.test.js src/components/StageBossPreview.test.jsx`
  - Passed: 8 files, 65 tests.
- `npm run build`
  - Passed after the Graphics Studio focus outline fix.
- Playwright graphics studio smoke check at `http://127.0.0.1:5173/graphics-studio#zombie-b02`
  - Confirmed `Part Focus / b02FaceTexture` is selected and the neon outline stays on the face-sized mesh area.
- Confirm B02 head front is square, the face texture plane uses the same square size, and previous front-overlapping hair block positions are absent.
- `npm test -- src/components/ZombieMesh.test.js src/components/GraphicsStudioPreview.test.js src/components/StudioTunedGroup.test.jsx src/components/Lobby.test.jsx src/components/StageBossPreview.test.js src/components/StageBossPreview.test.jsx`
  - Passed: 6 files, 39 tests.
- `npm run build`
  - Passed after the B02 square face cleanup.
- Confirm B02 concept-art framing keeps the face texture cropped below the 3D black hair cap and includes front side hair blocks.
- Confirm B02 side/back hair coverage is restored with side head and back skull hair blocks.
