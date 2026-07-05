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
