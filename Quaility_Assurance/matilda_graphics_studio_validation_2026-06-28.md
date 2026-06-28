# Matilda Graphics Studio Validation - 2026-06-28

## Result

- Targeted Matilda / Graphics Studio / Stage Object tests passed.
- Full test suite passed with a single Vitest worker.
- Production build passed.
- Browser smoke selected `Enemy / Matilda` in Graphics Studio and rendered the preview.
- Back-view browser smoke selected Matilda, rotated Y to 180, and confirmed the long hair covers the back of the head and upper back.
- Arm-flare browser smoke confirmed the arms attach at the shoulders and spread outward as they descend.
- Reference-refine browser smoke confirmed the updated chibi succubus silhouette renders in Graphics Studio.
- Head-texture browser smoke confirmed the supplied 512x512 PNG renders on Matilda's head-front texture slot without WebGL texture errors.
- Waist-ribbon browser smoke confirmed the magenta ribbon moved from the neck area to the waist area.

## Commands

- `npm test -- graphicsStudioConfig.test.js MatildaMesh.test.js StageObjects/stageObjectPlacements.test.js GraphicsStudio.test.jsx`
- `npx vitest run --maxWorkers=1 --no-file-parallelism`
- `npm run build`
- Browser smoke at `http://127.0.0.1:5173/graphics-studio`
- `npm test -- MatildaMesh.test.js`
- `npm test -- GraphicsStudio.test.jsx graphicsStudioConfig.test.js`
- Back-view browser smoke at `http://127.0.0.1:5173/graphics-studio`
- Arm-flare browser smoke at `http://127.0.0.1:5173/graphics-studio`
- Reference-refine browser smoke at `http://127.0.0.1:5173/graphics-studio`
- Head-texture browser smoke at `http://127.0.0.1:5173/graphics-studio`
- Waist-ribbon browser smoke at `http://127.0.0.1:5173/graphics-studio`

## Notes

- Earlier `npm test` with default parallel workers hit a Node/Vitest worker out-of-memory path on this machine.
- Re-running the whole suite with one worker passed: 64 files / 335 tests.
- Build still reports the existing Vite large chunk warning.
- Screenshot: `Quaility_Assurance/matilda_graphics_studio_browser_2026-06-28.png`
- Back-view screenshot: `Quaility_Assurance/matilda_back_hair_graphics_studio_2026-06-28.png`
- Arm-flare screenshot: `Quaility_Assurance/matilda_arm_flare_graphics_studio_2026-06-28.png`
- Reference-refine screenshot: `Quaility_Assurance/matilda_reference_refine_graphics_studio_2026-06-28.png`
- Head-texture screenshot: `Quaility_Assurance/matilda_head_texture_graphics_studio_2026-06-28.png`
- Waist-ribbon screenshot: `Quaility_Assurance/matilda_waist_ribbon_graphics_studio_2026-06-28.png`
- WebGL pixel readback: 687 x 500 canvas, 4968 / 4968 sampled pixels differed from the background.
- Latest focused tests: `MatildaMesh.test.js` 7 passed, `GraphicsStudio.test.jsx graphicsStudioConfig.test.js` 11 passed.
- Latest face-texture tests: `MatildaMesh.test.js` 8 passed.
- Latest waist-ribbon tests: `MatildaMesh.test.js` 8 passed.
- Latest build check: `npm run build` passed with the existing Vite large chunk warning.
