# Locked stage-card 3D padlock validation — 2026-07-18

- Task: `t_99114d1a`
- Validator: UI_Mini focused QA
- Target: `Developer/r3f_prototype` lobby locked stage cards
- Verdict: PASS for the scoped UI/test validation

## Acceptance coverage

| Requirement | Result | Evidence |
|---|---:|---|
| Locked Stage 2/3/4 cards show the 3D padlock preview instead of a boss | PASS | `Lobby.test.jsx` asserts `stage-lock-preview` exists and `stage-boss-preview` is absent for locked cards. |
| Locked cards keep real card structure/height/title/best-record overlay/button geometry | PASS | Locked cards render one `stage-card-preview-row`, overlay title/best record, disabled entry button at right/bottom, and disabled score-record button at left/top. |
| Unlock requirement appears inside disabled entry geometry with small readable font | PASS | Stage 2, Stage 3 fallback, and Stage 4 pre-clear hints are found inside disabled entry controls; Stage 4 font-size asserted as `11px`. |
| Separate full-width lock-hint row removed | PASS | Tests assert locked cards have one child and text does not contain the old `🔒 ...` row string. |
| Disabled score-record geometry remains present | PASS | Locked Stage 2/3/4 tests assert disabled `점수 레코드` buttons in preview row. |
| Locked interactions trigger no start/ranking/showtime/SFX | PASS | Card, lock preview, disabled entry, and disabled score-record dispatches do not call `onStartStage`, `onOpenRanking`, or `playSfx`, and showtime stays absent. |
| Stage 4 after Stage 3 clear remains safe/nonplayable | PASS | Existing test still passes: B04 preview renders, entry/ranking are disabled, and no start/ranking/showtime/SFX occurs. |
| Model geometry/Studio transforms/audio/runtime untouched | PASS | Diff review shows only `StageLockPreview` aria prop changed in the lock file; no geometry or transform values changed. |

## Commands and results

1. `npm exec -- vitest run src/components/Lobby.test.jsx`
   - RED confirmation before implementation: failed because locked cards did not yet render `stage-lock-preview`.
2. `npm exec -- vitest run src/components/Lobby.test.jsx`
   - PASS: 18/18 tests.
3. `npm exec -- vitest run src/lib/stageConfig.test.js src/components/Lobby.test.jsx src/components/StageLock.test.jsx src/lib/graphicsStudioStageLock.test.js`
   - PASS: 4 test files, 37 tests.
4. `git diff --check`
   - Ran from repository root. Exit 2 due unrelated existing CRLF/trailing-whitespace reports in prior uncommitted `GraphicsStudioPreview.jsx` / `graphicsStudioConfig.js` changes.
5. `git diff --check -- Developer/r3f_prototype/src/components/Lobby.jsx Developer/r3f_prototype/src/components/Lobby.test.jsx Developer/r3f_prototype/src/components/StageLock.jsx`
   - PASS for files touched by this task.
6. `git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check`
   - PASS with unrelated LF→CRLF warnings only.
7. Independent reviewer subagent
   - PASS: scoped diff review found no security concerns, logic errors, or locked-card safety regressions.

## Observations

- Existing test warnings remain visible in jsdom/R3F tests, but all assertions pass.
- No browser screenshot pass was added for this narrow card-rendering change; validation is focused component tests plus direct diff inspection.
- No commit or push was performed.
