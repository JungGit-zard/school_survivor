# Unconscious Student Flipped Mix QA - 2026-07-04

## Validation Plan

- Check that unconscious student variant catalog includes original and flipped variants.
- Check that Stage 1 placements include both original and flipped unconscious students.
- Check that the Stage 1 unconscious student count remains unchanged.

## Status

Passed automated test run:

```text
npm test -- src/components/StageObjects/stageObjectAssets.test.jsx src/components/StageObjects/stageObjectPlacements.test.js
Test Files 2 passed
Tests 17 passed
```

Passed production build:

```text
npm run build
vite build completed successfully
```
