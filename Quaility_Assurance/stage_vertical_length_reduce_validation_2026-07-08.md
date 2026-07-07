# Stage Vertical Length Reduction Validation

Date: 2026-07-08

## Expected

- Stage 1 bounds: `halfX = 10`, `halfZ = 14.4`.
- Stage 2 bounds: `halfX = 7.5`, `halfZ = 38.4`.

## Follow-up Expected

- Stage 2 bounds after second reduction: `halfX = 7.5`, `halfZ = 19.2`.

## Follow-up Result

- `npm test -- src/lib/stageConfig.test.js src/lib/playerMovementBounds.test.js src/lib/stage2CorridorWall.test.js src/components/StageObjects/stageObjectPlacements.test.js --run`: passed, 4 files / 23 tests.
- `npm run build`: passed.
- Existing Vite bundle-size and dynamic-import warnings remained; no Stage 2 bounds build error was found.

## Result

- `npm test -- src/lib/stageConfig.test.js`: passed, 1 file / 8 tests.
- `npm run build`: passed.
- Vite reported existing bundle-size and dynamic-import warnings; no stage-bounds build error was found.
