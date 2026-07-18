# Stage Object Implementation - Chair and Unconscious Student

## Summary

Implemented two reusable StageObjects assets in the same component repository as the classroom desk.

## Files

- `src/components/StageObjects/ClassroomChair.jsx`
  - Adds `ClassroomChair`.
  - Exports `CLASSROOM_CHAIR_VARIANTS`.
  - Uses primitive Three.js geometry, toon material, and outline.

- `src/components/StageObjects/UnconsciousStudent.jsx`
  - Adds `UnconsciousStudent`.
  - Exports `UNCONSCIOUS_STUDENT_VARIANTS`.
  - Uses primitive geometry for a low-poly lying student object.

- `src/components/StageObjects/index.js`
  - Exports both new assets and variant catalogs.

- `src/components/StageObjects/StageObjectLayer.jsx`
  - Registers `classroomChair` and `unconsciousStudent` for later placement data.

- `src/components/StageObjects/stageObjectAssets.test.jsx`
  - Verifies asset exports and variant catalogs.

## Scope

- This change creates reusable graphic assets.
- It does not add them to any stage placement list yet.
- No collision behavior was added; these are visual stage props like the current desk object.

## Verification

- `npm test -- src/components/StageObjects/stageObjectAssets.test.jsx --pool=threads`: passed.
- `npx vitest run --pool=forks --maxWorkers=1`: passed, 35 files / 208 tests.
- `npm run build`: passed, with the existing Vite large chunk warning.
