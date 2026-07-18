# QA Validation - Chair and Unconscious Student StageObjects

## Scope

Validate that the classroom chair and unconscious student were added as reusable StageObjects assets without placing them into gameplay.

## Automated Checks

- `npm test -- src/components/StageObjects/stageObjectAssets.test.jsx --pool=threads`
  - Result: passed.
  - Covered:
    - `ClassroomChair` export exists.
    - `UnconsciousStudent` export exists.
    - Chair variants are present.
    - Unconscious student variants are present.

- `npm run build`
  - Result: passed.
  - Note: Vite large chunk warning remains; this is pre-existing build guidance, not a compile failure.

- `npx vitest run --pool=forks --maxWorkers=1`
  - Result: passed.
  - Scope after Stage 1 placement: 35 test files, 210 tests.

- `npm test -- src/components/StageObjects/stageObjectPlacements.test.js src/components/StageObjects/stageObjectAssets.test.jsx --pool=threads`
  - Result after Stage 1 placement: passed.
  - Scope: 2 test files, 9 tests.

## Runner Note

- `npm test` and `npm test -- --pool=threads` hit worker memory/process errors in this Windows environment during full-suite execution.
- Re-running the full suite with one fork worker completed successfully.

## Risk Notes

- The assets are now placed in Stage 1 only.
- Gameplay layout, readability, and mobile screen density still require manual browser QA because the current automated tests verify data rules, not final pixels.
- The unconscious student is a visual prop. If later treated as a character-like object in gameplay, confirm it remains clearly non-interactive unless the design changes.
- Manual visual QA is still needed after placement because current automated tests only verify catalog/export structure.
