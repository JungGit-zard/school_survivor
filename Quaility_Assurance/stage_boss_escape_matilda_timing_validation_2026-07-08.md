# Stage Boss / Escape / Matilda Timing Validation

Date: 2026-07-08

## Expected Timing

- Boss appears: 120 seconds.
- Escape portal opens: 150 seconds.
- Matilda warning starts: 170 seconds.
- Matilda appears: 180 seconds.

## Validation Plan

- Run stage configuration tests to confirm both stages share the new timing.
- Run enemy timeline tests to confirm B01 and B02 burst events fire at 120 seconds.
- Run a production build to catch import or syntax regressions.

## Result

- `npm test -- src/lib/stageConfig.test.js src/components/Enemies.test.jsx`: passed, 2 files / 33 tests.
- `npm run build`: passed.
- Vite reported existing bundle-size and dynamic-import warnings; no timing-change build error was found.
