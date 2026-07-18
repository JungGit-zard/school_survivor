# Locked stage-card 3D padlock implementation — 2026-07-18

- Task: `t_99114d1a`
- Role: UI_Mini / mobile UI implementation
- Scope: locked lobby stage-card rendering only

## Summary

Locked stage cards now reuse the same real preview-card structure as unlocked Stage 1-3 cards. The separate full-width lock-hint row was removed from rendering; the unlock requirement is shown inside the existing entry-button geometry as a small disabled control.

## Code paths changed

- `Developer/r3f_prototype/src/components/Lobby.jsx`
  - Imports `StageLockPreview`.
  - Locked cards render `StageLockPreview` in the preview area instead of omitting the 3D preview.
  - Locked cards keep title and best-record overlay inside `previewTextLayer`.
  - Locked cards keep the same absolute entry-button and score-record button geometry as unlocked cards.
  - Entry and score-record controls are disabled and have no press classes, so locked interactions do not start stages, open ranking, show showtime, or play SFX.
  - Stage 4 pre-clear hint is `Stage 3 클리어 시 열림`; generic locked stages use the existing fallback requirement text.
- `Developer/r3f_prototype/src/components/StageLock.jsx`
  - `StageLockPreview` now accepts an `ariaLabel` prop for locked-card accessibility.
  - No model geometry, Studio item id, Studio transforms, or lock camera numbers were changed.
- `Developer/r3f_prototype/src/components/Lobby.test.jsx`
  - Added focused locked-card assertions for Stage 2, Stage 3, and Stage 4 before Stage 3 clear.
  - Preserved Stage 4 after-clear B04/nonplayable safety assertions.

## Non-goals preserved

- Did not change StageLockModel geometry.
- Did not change Graphics Studio transforms or numeric scene-tree behavior.
- Did not change audio, SFX registry, playable stage runtime, Stage 4 runtime, commits, or pushes.
- Did not modify unrelated uncommitted work.

## Verification

Commands run from `Developer/r3f_prototype` unless noted:

1. `npm exec -- vitest run src/components/Lobby.test.jsx`
   - RED before implementation: failed on missing locked `stage-lock-preview` in Stage 4 and Stage 2/3 tests.
2. `npm exec -- vitest run src/components/Lobby.test.jsx`
   - GREEN after implementation: 18 tests passed.
3. `npm exec -- vitest run src/lib/stageConfig.test.js src/components/Lobby.test.jsx src/components/StageLock.test.jsx src/lib/graphicsStudioStageLock.test.js`
   - PASS: 4 files / 37 tests.
4. From repo root: `git diff --check`
   - Exit 2 because existing unrelated CRLF/trailing-whitespace reports remain in `GraphicsStudioPreview.jsx` and `graphicsStudioConfig.js`; none of the scoped files for this task were listed.
5. From repo root: `git diff --check -- Developer/r3f_prototype/src/components/Lobby.jsx Developer/r3f_prototype/src/components/Lobby.test.jsx Developer/r3f_prototype/src/components/StageLock.jsx`
   - PASS.
6. From repo root: `git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check`
   - PASS, with only LF→CRLF working-copy warnings on unrelated files.
7. Independent reviewer subagent
   - PASS: no security concerns or logic errors found in the scoped 5-file diff.

## Notes

The focused test output still contains existing jsdom/R3F warnings (`Multiple instances of Three.js`, `act(...)` environment, and mocked R3F DOM tag warnings in `StageLock.test.jsx`). Assertions pass and the warnings are not introduced by locked-card behavior.
