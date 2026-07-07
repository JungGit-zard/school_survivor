# Stage Vertical Length Reduction Validation

Date: 2026-07-08

## Expected

- Stage 1 bounds: `halfX = 10`, `halfZ = 14.4`.
- Stage 2 bounds: `halfX = 7.5`, `halfZ = 38.4`.

## Result

- `npm test -- src/lib/stageConfig.test.js`: passed, 1 file / 8 tests.
- `npm run build`: passed.
- Vite reported existing bundle-size and dynamic-import warnings; no stage-bounds build error was found.
